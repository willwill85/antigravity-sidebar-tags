const fs = require("fs");
const path = require("path");
const os = require("os");
const http = require("http");
const net = require("net");
const crypto = require("crypto");
const { execFile, spawn } = require("child_process");
const readline = require("readline");

function getActivePortPaths() {
  const home = os.homedir();
  const candidates = [];
  if (process.platform === "darwin") {
    candidates.push(path.join(home, "Library/Application Support/Antigravity/DevToolsActivePort"));
  } else if (process.platform === "win32") {
    if (process.env.APPDATA) {
      candidates.push(path.join(process.env.APPDATA, "Antigravity", "DevToolsActivePort"));
    }
    candidates.push(path.join(home, "AppData/Roaming/Antigravity/DevToolsActivePort"));
  } else {
    candidates.push(path.join(home, ".config/Antigravity/DevToolsActivePort"));
  }
  return candidates;
}

const TAGS_JSON_FILE =
  process.env.AGY_TAGS_CONFIG ||
  path.join(os.homedir(), ".gemini", "antigravity", "project_tags.json");

const AGY_REMOTE_DIR = process.env.AGY_HOME || path.join(os.homedir(), ".agy-remote");
const SESSIONS_JSON_FILE = path.join(AGY_REMOTE_DIR, "sessions.json");
const BRAIN_DIR = path.join(os.homedir(), ".gemini", "antigravity", "brain");
const PI_AGENT_DIR = path.join(os.homedir(), ".pi", "agent");
const INJECT_JS_FILE = path.join(__dirname, "inject.js");

const WEB_PROXY_PORT = parseInt(process.env.AGY_PLUGIN_PROXY_PORT || "8765", 10);
const WEB_UPSTREAM_PORT = parseInt(process.env.AGY_PLUGIN_UPSTREAM_PORT || "8767", 10);

const attachedTargets = new Map(); // targetId -> { ws, send }
const activePiProcesses = new Map(); // runId -> ChildProcess
const webSseClients = new Set(); // Set<http.ServerResponse>

function getEnrichedEnv() {
  const extraPaths = [
    "/opt/homebrew/bin",
    "/opt/homebrew/sbin",
    "/usr/local/bin",
    path.join(os.homedir(), ".local/bin"),
    path.join(os.homedir(), ".bun/bin"),
    path.dirname(process.execPath)
  ];
  const currentPath = process.env.PATH || "/usr/bin:/bin:/usr/sbin:/sbin";
  return {
    ...process.env,
    PATH: Array.from(new Set([...extraPaths, ...currentPath.split(path.delimiter)])).join(path.delimiter)
  };
}

function resolvePiBinary() {
  const candidates = [
    "/opt/homebrew/bin/pi",
    "/usr/local/bin/pi",
    path.join(os.homedir(), ".local/bin/pi"),
    path.join(os.homedir(), ".npm-global/bin/pi")
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return "pi";
}

function loadPiModelsConfig() {
  const modelsFile = path.join(PI_AGENT_DIR, "models.json");
  const settingsFile = path.join(PI_AGENT_DIR, "settings.json");
  let defaultProvider = "surplus";
  let defaultModel = "claude-haiku-5.5";

  try {
    if (fs.existsSync(settingsFile)) {
      const s = JSON.parse(fs.readFileSync(settingsFile, "utf8"));
      if (s.defaultProvider) defaultProvider = s.defaultProvider;
      if (s.defaultModel) defaultModel = s.defaultModel;
    }
  } catch (e) {}

  const list = [];
  try {
    if (fs.existsSync(modelsFile)) {
      const m = JSON.parse(fs.readFileSync(modelsFile, "utf8"));
      const providers = m.providers || {};
      for (const [provName, provObj] of Object.entries(providers)) {
        const models = Array.isArray(provObj.models) ? provObj.models : [];
        for (const mod of models) {
          if (!mod.id) continue;
          list.push({
            fullId: `${provName}/${mod.id}`,
            provider: provName,
            id: mod.id,
            name: mod.name || mod.id,
            reasoning: Boolean(mod.reasoning),
            contextWindow: mod.contextWindow || null
          });
        }
      }
    }
  } catch (e) {
    console.error("[sidebar-tags] Failed to read ~/.pi/agent/models.json:", e.message);
  }

  return {
    defaultFullId: `${defaultProvider}/${defaultModel}`,
    models: list
  };
}

function getConversationBrainDir(conversationId) {
  const safeId = (conversationId || "default").replace(/[^a-zA-Z0-9_-]/g, "_");
  const dir = path.join(BRAIN_DIR, safeId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function loadPiTurnsForConversation(conversationId) {
  if (!conversationId) return [];
  try {
    const file = path.join(getConversationBrainDir(conversationId), "pi_turns.json");
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    }
  } catch (e) {}
  return [];
}

function savePiTurnForConversation(conversationId, turnObj) {
  if (!conversationId) return;
  try {
    const dir = getConversationBrainDir(conversationId);
    const file = path.join(dir, "pi_turns.json");
    const existing = loadPiTurnsForConversation(conversationId);
    const idx = existing.findIndex(t => t.turnId === turnObj.turnId);
    if (idx >= 0) {
      existing[idx] = turnObj;
    } else {
      existing.push(turnObj);
    }
    fs.writeFileSync(file, JSON.stringify(existing, null, 2), "utf8");

    const mdFile = path.join(dir, "pi_shared_context.md");
    const mdLines = [
      `# Pi Agent Shared Conversation Turns (Conversation: ${conversationId})`,
      ""
    ];
    for (const t of existing.slice(-10)) {
      mdLines.push(`## [${new Date(t.timestamp || Date.now()).toLocaleString()}] Model: ${t.model}`);
      mdLines.push(`**User**: ${t.prompt}`);
      if (Array.isArray(t.tools) && t.tools.length > 0) {
        mdLines.push(`**Tools Executed**: ${t.tools.map(tl => `\`${tl.name}(${tl.summary || ""})\``).join(", ")}`);
      }
      mdLines.push(`**Pi Response**:\n${t.response || "(empty)"}\n`);
    }
    fs.writeFileSync(mdFile, mdLines.join("\n"), "utf8");
  } catch (e) {
    console.error("[sidebar-tags] Failed to save pi_turns.json:", e.message);
  }
}

function buildSharedContextPrompt(conversationId, projectPath) {
  const parts = [];
  parts.push(
    `You are operating inside Google Antigravity as the "Pi" coding engine, sharing the active project workspace (${projectPath}) and conversation context with Antigravity (AGY).`
  );

  if (conversationId) {
    const transcriptFile = path.join(
      BRAIN_DIR,
      conversationId,
      ".system_generated",
      "logs",
      "transcript.jsonl"
    );
    const agyTurns = [];
    if (fs.existsSync(transcriptFile)) {
      try {
        const lines = fs.readFileSync(transcriptFile, "utf8").trim().split(/\r?\n/);
        for (const line of lines.slice(-30)) {
          try {
            const step = JSON.parse(line);
            if (step.type === "USER_INPUT" && step.content) {
              const cleaned = step.content
                .replace(/<USER_REQUEST>|<\/USER_REQUEST>/g, "")
                .replace(/<ADDITIONAL_METADATA>[\s\S]*?<\/ADDITIONAL_METADATA>/g, "")
                .trim();
              if (cleaned) {
                agyTurns.push({ role: "User (to AGY)", text: cleaned.slice(0, 1200) });
              }
            } else if (step.type === "PLANNER_RESPONSE" && step.content) {
              agyTurns.push({ role: "AGY Assistant", text: step.content.trim().slice(0, 1500) });
            }
          } catch (e) {}
        }
      } catch (e) {}
    }

    if (agyTurns.length > 0) {
      parts.push("\n### Recent Antigravity (AGY) Conversation Context:");
      for (const t of agyTurns.slice(-8)) {
        parts.push(`- **${t.role}**: ${t.text}`);
      }
    }

    const piTurns = loadPiTurnsForConversation(conversationId);
    if (piTurns.length > 0) {
      parts.push("\n### Recent Pi Turns in This Conversation:");
      for (const pt of piTurns.slice(-6)) {
        parts.push(`- **User (to Pi)**: ${pt.prompt}`);
        if (pt.response) {
          parts.push(`- **Pi (${pt.model})**: ${pt.response.slice(0, 1500)}`);
        }
      }
    }
  }

  return parts.join("\n");
}

function broadcastEventToAllClients(evt) {
  // 1. Broadcast to all attached Desktop CDP targets
  const expr = `window.__agyPiStreamEvent && window.__agyPiStreamEvent(${JSON.stringify(evt)});`;
  for (const { send } of attachedTargets.values()) {
    try {
      send("Runtime.evaluate", { expression: expr, returnByValue: true });
    } catch (e) {}
  }

  // 2. Broadcast to all connected Web SSE clients
  const ssePayload = `data: ${JSON.stringify(evt)}\n\n`;
  for (const res of webSseClients) {
    try {
      res.write(ssePayload);
    } catch (e) {
      webSseClients.delete(res);
    }
  }
}

function startPiRun(params) {
  const {
    runId,
    turnId,
    conversationId,
    projectPath,
    model,
    prompt
  } = params;

  const cwd = projectPath && fs.existsSync(projectPath) ? projectPath : os.homedir();
  const piBin = resolvePiBinary();
  const sharedContext = buildSharedContextPrompt(conversationId, cwd);

  const args = [
    "--print",
    "--mode",
    "json",
    "--no-extensions",
    "--no-mcp",
    "--no-skills"
  ];
  if (model) {
    args.push("--model", model);
  }
  if (sharedContext) {
    args.push("--append-system-prompt", sharedContext);
  }
  args.push("--", prompt);

  let fullResponse = "";
  const toolsExecuted = [];

  // Broadcast start event so both Desktop and Web see the new turn immediately
  broadcastEventToAllClients({
    runId,
    turnId,
    conversationId,
    type: "turn_init",
    turn: {
      turnId,
      runId,
      conversationId,
      projectPath: cwd,
      model,
      prompt,
      response: "",
      tools: [],
      running: true,
      timestamp: Date.now()
    }
  });

  const child = spawn(piBin, args, {
    cwd,
    env: getEnrichedEnv(),
    stdio: ["ignore", "pipe", "pipe"]
  });

  activePiProcesses.set(runId, child);

  const rl = readline.createInterface({ input: child.stdout });
  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const j = JSON.parse(trimmed);
      if (j.type === "message_update" && j.assistantMessageEvent?.type === "text_delta") {
        const delta = j.assistantMessageEvent.delta || "";
        if (delta) {
          fullResponse += delta;
          broadcastEventToAllClients({
            runId,
            turnId,
            conversationId,
            type: "text_delta",
            delta,
            fullResponse
          });
        }
      } else if (j.type === "tool_execution_start") {
        const toolName = j.toolName || "tool";
        const toolArgs = j.args || {};
        const summary =
          toolArgs.path ||
          toolArgs.command ||
          JSON.stringify(toolArgs).slice(0, 80);
        toolsExecuted.push({ name: toolName, summary, status: "running" });
        broadcastEventToAllClients({
          runId,
          turnId,
          conversationId,
          type: "tool_start",
          toolName,
          summary
        });
      } else if (j.type === "tool_execution_end") {
        const toolName = j.toolName || "tool";
        broadcastEventToAllClients({
          runId,
          turnId,
          conversationId,
          type: "tool_end",
          toolName
        });
      } else if (j.type === "agent_end" && !fullResponse && Array.isArray(j.messages)) {
        const lastAssistant = [...j.messages].reverse().find(m => m.role === "assistant");
        if (lastAssistant && Array.isArray(lastAssistant.content)) {
          const txt = lastAssistant.content.filter(c => c.type === "text").map(c => c.text).join("");
          if (txt) {
            fullResponse = txt;
          }
        }
      }
    } catch (e) {}
  });

  let stderrBuf = "";
  child.stderr.on("data", (chunk) => {
    stderrBuf += chunk.toString();
  });

  child.on("close", (code) => {
    activePiProcesses.delete(runId);
    if (!fullResponse && stderrBuf.trim()) {
      fullResponse = `⚠️ Pi 执行返回提示:\n\`\`\`\n${stderrBuf.trim().slice(0, 1200)}\n\`\`\``;
    }
    const turnRecord = {
      turnId,
      conversationId,
      projectPath: cwd,
      model,
      prompt,
      response: fullResponse,
      tools: toolsExecuted,
      timestamp: Date.now(),
      exitCode: code
    };
    savePiTurnForConversation(conversationId, turnRecord);
    broadcastEventToAllClients({
      runId,
      turnId,
      conversationId,
      type: "done",
      fullResponse,
      tools: toolsExecuted,
      exitCode: code
    });
  });

  child.on("error", (err) => {
    activePiProcesses.delete(runId);
    broadcastEventToAllClients({
      runId,
      turnId,
      conversationId,
      type: "error",
      error: err.message || String(err)
    });
  });

  return { started: true, runId, cwd };
}

function stopPiRun(runId) {
  const child = activePiProcesses.get(runId);
  if (child) {
    try {
      child.kill("SIGTERM");
    } catch (e) {}
    activePiProcesses.delete(runId);
    return { stopped: true };
  }
  return { stopped: false };
}

function readConfigJson() {
  try {
    if (fs.existsSync(TAGS_JSON_FILE)) {
      return JSON.parse(fs.readFileSync(TAGS_JSON_FILE, "utf8"));
    }
  } catch (e) {
    console.error("[sidebar-tags] Failed to read project_tags.json:", e.message);
  }
  return null;
}

function saveConfigJson(rawStr) {
  try {
    const parsed = typeof rawStr === "string" ? JSON.parse(rawStr) : rawStr;
    const dir = path.dirname(TAGS_JSON_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(TAGS_JSON_FILE, JSON.stringify(parsed, null, 2), "utf8");
    // Broadcast tag config update to all clients so Desktop & Web stay in sync
    broadcastEventToAllClients({
      type: "tags_updated",
      config: parsed
    });
  } catch (e) {
    console.error("[sidebar-tags] Failed to write project_tags.json:", e.message);
  }
}

function listDirectoryEntries(dirPath) {
  const resolved = path.resolve(dirPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Directory not found: ${resolved}`);
  }
  const dirents = fs.readdirSync(resolved, { withFileTypes: true });
  const items = [];
  for (const d of dirents) {
    if (d.name === ".DS_Store" || d.name === ".git") continue;
    const fullPath = path.join(resolved, d.name);
    let isDir = d.isDirectory();
    let size = 0;
    try {
      const st = fs.statSync(fullPath);
      isDir = st.isDirectory();
      size = st.size || 0;
    } catch (e) {}
    items.push({
      name: d.name,
      path: fullPath,
      isDir,
      size
    });
  }
  items.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
  });
  return items;
}

function revealInFinder(targetPath) {
  const resolved = path.resolve(targetPath);
  if (process.platform === "darwin") {
    execFile("open", ["-R", resolved]);
  } else if (process.platform === "win32") {
    execFile("explorer.exe", [`/select,${resolved}`]);
  } else {
    execFile("xdg-open", [path.dirname(resolved)]);
  }
  return { ok: true, path: resolved };
}

function openWithDefaultApp(targetPath) {
  const resolved = path.resolve(targetPath);
  if (process.platform === "darwin") {
    execFile("open", [resolved]);
  } else if (process.platform === "win32") {
    execFile("cmd.exe", ["/c", "start", "", resolved]);
  } else {
    execFile("xdg-open", [resolved]);
  }
  return { ok: true, path: resolved };
}

function executeRpcCommand(cmd, args = {}) {
  if (cmd === "getTags") {
    return readConfigJson();
  } else if (cmd === "saveTags") {
    saveConfigJson(args.rawStr || args.config);
    return { saved: true };
  } else if (cmd === "listDir") {
    return listDirectoryEntries(args.dirPath);
  } else if (cmd === "revealInFinder") {
    return revealInFinder(args.targetPath);
  } else if (cmd === "openDefault") {
    return openWithDefaultApp(args.targetPath);
  } else if (cmd === "getPiModels") {
    return loadPiModelsConfig();
  } else if (cmd === "getPiTurns") {
    return loadPiTurnsForConversation(args.conversationId);
  } else if (cmd === "runPiPrompt") {
    return startPiRun(args);
  } else if (cmd === "stopPiRun") {
    return stopPiRun(args.runId);
  }
  throw new Error(`Unknown command: ${cmd}`);
}

function handleBridgeCall(send, rawPayload) {
  let req;
  try {
    req = JSON.parse(rawPayload);
  } catch (e) {
    return;
  }
  const { reqId, cmd, args } = req || {};
  if (!reqId) return;

  let resObj = { ok: true, data: null };
  try {
    resObj.data = executeRpcCommand(cmd, args);
  } catch (err) {
    resObj = { ok: false, error: err.message || String(err) };
  }

  const expr = `window.__agyBridgeResolve && window.__agyBridgeResolve(${JSON.stringify(reqId)}, ${JSON.stringify(resObj)});`;
  send("Runtime.evaluate", { expression: expr, returnByValue: true });
}

function buildPayloadScript(isWeb = false) {
  const cfg = readConfigJson();
  const injectCode = fs.readFileSync(INJECT_JS_FILE, "utf8");
  const webPrefix = isWeb ? `window.__AGY_IS_WEB__ = true;\n` : "";
  const cfgPrefix = cfg
    ? `window.__AGY_INITIAL_PROJECT_TAGS__ = ${JSON.stringify(cfg)};\n`
    : "";
  return webPrefix + cfgPrefix + injectCode;
}

// --- Web Gateway & Reverse Proxy (Port 8765 -> 8766) ---
function isWebRequestAuthenticated(req) {
  const cookieHeader = req.headers.cookie || "";
  const match = cookieHeader.match(/(?:^|;\s*)agy_session=([a-f0-9]+)/i);
  if (match && match[1]) {
    try {
      if (fs.existsSync(SESSIONS_JSON_FILE)) {
        const rawToken = match[1];
        const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
        const sessions = JSON.parse(fs.readFileSync(SESSIONS_JSON_FILE, "utf8"));
        if (
          Array.isArray(sessions) &&
          sessions.some(s => s.key === rawToken || s.key === hashedToken)
        ) {
          return true;
        }
      }
    } catch (e) {}
  }
  // Also allow purely local loopback requests when not coming through Cloudflare
  const remote = req.socket?.remoteAddress || "";
  if ((remote === "127.0.0.1" || remote === "::1" || remote === "::ffff:127.0.0.1") && !req.headers["cf-connecting-ip"]) {
    return true;
  }
  return false;
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    ".html": "text/html; charset=utf-8",
    ".htm": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/plain; charset=utf-8",
    ".mjs": "text/plain; charset=utf-8",
    ".cjs": "text/plain; charset=utf-8",
    ".ts": "text/plain; charset=utf-8",
    ".tsx": "text/plain; charset=utf-8",
    ".jsx": "text/plain; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".md": "text/plain; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".py": "text/plain; charset=utf-8",
    ".sh": "text/plain; charset=utf-8",
    ".yml": "text/plain; charset=utf-8",
    ".yaml": "text/plain; charset=utf-8",
    ".csv": "text/plain; charset=utf-8",
    ".log": "text/plain; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
    ".mp4": "video/mp4",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav"
  };
  return map[ext] || "application/octet-stream";
}

function startWebGatewayServer() {
  const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || "127.0.0.1"}`);

    // Handle /__agy-plugin/* endpoints directly
    if (parsedUrl.pathname.startsWith("/__agy-plugin/")) {
      if (!isWebRequestAuthenticated(req)) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "unauthorized" }));
        return;
      }

      if (req.method === "GET" && parsedUrl.pathname === "/__agy-plugin/inject.js") {
        const script = buildPayloadScript(true);
        res.writeHead(200, {
          "Content-Type": "application/javascript; charset=utf-8",
          "Cache-Control": "no-store"
        });
        res.end(script);
        return;
      }

      if (req.method === "GET" && parsedUrl.pathname === "/__agy-plugin/pi-stream") {
        res.writeHead(200, {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive",
          "X-Accel-Buffering": "no"
        });
        res.write(": connected\n\n");
        webSseClients.add(res);
        req.on("close", () => {
          webSseClients.delete(res);
        });
        return;
      }

      if (req.method === "GET" && parsedUrl.pathname === "/__agy-plugin/file") {
        const filePath = parsedUrl.searchParams.get("path");
        const download = parsedUrl.searchParams.get("download") === "1";
        if (!filePath || !fs.existsSync(filePath)) {
          res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("File not found");
          return;
        }
        try {
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("Cannot stream a directory");
            return;
          }
          const fileName = path.basename(filePath);
          const headers = {
            "Content-Type": getMimeType(filePath),
            "Content-Length": stat.size,
            "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(fileName)}`
          };
          res.writeHead(200, headers);
          fs.createReadStream(filePath).pipe(res);
        } catch (err) {
          res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
          res.end(err.message);
        }
        return;
      }

      if (req.method === "POST" && parsedUrl.pathname === "/__agy-plugin/api") {
        let body = "";
        req.on("data", chunk => {
          body += chunk.toString();
        });
        req.on("end", () => {
          let resObj = { ok: true, data: null };
          try {
            const { cmd, args } = JSON.parse(body || "{}");
            resObj.data = executeRpcCommand(cmd, args || {});
          } catch (err) {
            resObj = { ok: false, error: err.message || String(err) };
          }
          res.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store"
          });
          res.end(JSON.stringify(resObj));
        });
        return;
      }

      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "not_found" }));
      return;
    }

    // Reverse proxy all other HTTP requests to agy-server (127.0.0.1:8766)
    const isHtmlCandidate =
      req.method === "GET" &&
      !parsedUrl.pathname.startsWith("/__agy/") &&
      !/\.(js|css|wasm|svg|png|jpg|jpeg|gif|webp|ico|json|woff2?|ttf|map)$/i.test(parsedUrl.pathname);

    const outHeaders = { ...req.headers };
    if (isHtmlCandidate) {
      delete outHeaders["accept-encoding"];
    }

    const proxyReq = http.request(
      {
        hostname: "127.0.0.1",
        port: WEB_UPSTREAM_PORT,
        path: req.url,
        method: req.method,
        headers: outHeaders
      },
      (proxyRes) => {
        const contentType = proxyRes.headers["content-type"] || "";
        if (isHtmlCandidate && proxyRes.statusCode === 200 && contentType.includes("text/html")) {
          const chunks = [];
          proxyRes.on("data", c => chunks.push(c));
          proxyRes.on("end", () => {
            let html = Buffer.concat(chunks).toString("utf8");
            if (html.includes('<div id="root"></div>') && !html.includes("/__agy-plugin/inject.js")) {
              html = html.replace(
                "</body>",
                `<script defer src="/__agy-plugin/inject.js"></script>\n</body>`
              );
            }
            const buf = Buffer.from(html, "utf8");
            const respHeaders = { ...proxyRes.headers };
            respHeaders["content-length"] = String(buf.length);
            delete respHeaders["content-encoding"];
            res.writeHead(proxyRes.statusCode, respHeaders);
            res.end(buf);
          });
        } else {
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.pipe(res);
        }
      }
    );

    proxyReq.on("error", (err) => {
      if (!res.headersSent) {
        res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
      }
      res.end(`Bad Gateway (agy-server on ${WEB_UPSTREAM_PORT}): ${err.message}`);
    });

    req.pipe(proxyReq);
  });

  // Raw TCP pipe for WebSocket upgrades
  server.on("upgrade", (req, clientSocket, head) => {
    const upstreamSocket = net.connect(WEB_UPSTREAM_PORT, "127.0.0.1", () => {
      const reqLines = [`${req.method} ${req.url} HTTP/${req.httpVersion}`];
      for (let i = 0; i < req.rawHeaders.length; i += 2) {
        reqLines.push(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}`);
      }
      reqLines.push("", "");
      upstreamSocket.write(reqLines.join("\r\n"));
      if (head && head.length > 0) {
        upstreamSocket.write(head);
      }
      clientSocket.pipe(upstreamSocket);
      upstreamSocket.pipe(clientSocket);
    });

    upstreamSocket.on("error", () => {
      try { clientSocket.destroy(); } catch (e) {}
    });
    clientSocket.on("error", () => {
      try { upstreamSocket.destroy(); } catch (e) {}
    });
  });

  server.on("error", (err) => {
    console.error(`[sidebar-tags] Web gateway port ${WEB_PROXY_PORT} error:`, err.message);
  });

  server.listen(WEB_PROXY_PORT, "0.0.0.0", () => {
    console.log(`[sidebar-tags] Web gateway listening on 0.0.0.0:${WEB_PROXY_PORT} -> 127.0.0.1:${WEB_UPSTREAM_PORT}`);
  });

  // Keep SSE connections alive through Cloudflare Tunnel
  setInterval(() => {
    for (const res of webSseClients) {
      try {
        res.write(": ping\n\n");
      } catch (e) {
        webSseClients.delete(res);
      }
    }
  }, 15000);
}

// --- Desktop CDP Discovery & Injection ---
function readActivePort() {
  for (const file of getActivePortPaths()) {
    try {
      if (fs.existsSync(file)) {
        const lines = fs.readFileSync(file, "utf8").trim().split(/\r?\n/);
        const port = parseInt(lines[0], 10);
        if (port > 0) return { port, file };
      }
    } catch (e) {}
  }
  return null;
}

async function discoverPageTargets() {
  const active = readActivePort();
  if (!active) return [];
  try {
    const res = await fetch(`http://127.0.0.1:${active.port}/json`);
    if (!res.ok) return [];
    const targets = await res.json();
    return targets.filter(
      (t) =>
        t.type === "page" &&
        t.webSocketDebuggerUrl &&
        t.url &&
        (t.url.includes("127.0.0.1") || t.url.includes("localhost") || t.url.includes("workbench"))
    );
  } catch (e) {
    return [];
  }
}

function attachToTarget(target) {
  if (!target.webSocketDebuggerUrl || attachedTargets.has(target.id)) {
    return;
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let msgId = 1;

  const send = (method, params = {}) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ id: msgId++, method, params }));
    }
  };
  attachedTargets.set(target.id, { ws, send });

  ws.onopen = () => {
    console.log(`[sidebar-tags] Attached to page target ${target.id} (${target.title || target.url})`);
    const source = buildPayloadScript(false);
    send("Runtime.enable");
    send("Page.enable");
    send("Runtime.addBinding", { name: "__agySaveProjectTags" });
    send("Runtime.addBinding", { name: "__agyBridgeCall" });
    send("Page.addScriptToEvaluateOnNewDocument", { source });
    send("Runtime.evaluate", { expression: source, returnByValue: true });
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.method === "Runtime.bindingCalled") {
        if (msg.params?.name === "__agySaveProjectTags") {
          saveConfigJson(msg.params.payload);
        } else if (msg.params?.name === "__agyBridgeCall") {
          handleBridgeCall(send, msg.params.payload);
        }
      } else if (msg.method === "Page.loadEventFired") {
        const source = buildPayloadScript(false);
        send("Runtime.evaluate", { expression: source, returnByValue: true });
      }
    } catch (e) {}
  };

  ws.onclose = () => {
    attachedTargets.delete(target.id);
  };

  ws.onerror = () => {
    attachedTargets.delete(target.id);
  };
}

async function pollTargets() {
  const targets = await discoverPageTargets();
  for (const t of targets) {
    attachToTarget(t);
  }
}

async function runOnce(mode = "inject") {
  const targets = await discoverPageTargets();
  if (targets.length === 0) {
    return { count: 0 };
  }
  const source =
    mode === "uninstall"
      ? `if (window.__AGY_TAG_NAV_INSTANCE__?.uninstall) { window.__AGY_TAG_NAV_INSTANCE__.uninstall(); "uninstalled"; } else { "not_installed"; }`
      : buildPayloadScript(false);

  let count = 0;
  for (const t of targets) {
    await new Promise((resolve) => {
      const ws = new WebSocket(t.webSocketDebuggerUrl);
      const timer = setTimeout(() => {
        try { ws.close(); } catch (e) {}
        resolve();
      }, 3000);
      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            id: 1,
            method: "Runtime.evaluate",
            params: { expression: source, returnByValue: true }
          })
        );
      };
      ws.onmessage = () => {
        count++;
        clearTimeout(timer);
        try { ws.close(); } catch (e) {}
        resolve();
      };
      ws.onerror = () => {
        clearTimeout(timer);
        resolve();
      };
    });
  }
  return { count };
}

function startDaemon() {
  console.log("[sidebar-tags] Starting Antigravity Sidebar Tags, Files & Pi Engine daemon...");
  console.log(`[sidebar-tags] Config file: ${TAGS_JSON_FILE}`);
  startWebGatewayServer();
  pollTargets();
  setInterval(pollTargets, 3000);
}

if (require.main === module) {
  startDaemon();
}

module.exports = {
  startDaemon,
  runOnce,
  readActivePort,
  discoverPageTargets,
  TAGS_JSON_FILE
};

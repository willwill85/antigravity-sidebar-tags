const fs = require("fs");
const path = require("path");
const os = require("os");
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

const BRAIN_DIR = path.join(os.homedir(), ".gemini", "antigravity", "brain");
const PI_AGENT_DIR = path.join(os.homedir(), ".pi", "agent");
const INJECT_JS_FILE = path.join(__dirname, "inject.js");

const attachedTargets = new Map(); // targetId -> { ws, send }
const activePiProcesses = new Map(); // runId -> ChildProcess

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

    // Also write human-readable markdown summary for AGY to read seamlessly
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
    // 1. Read recent AGY transcript turns from transcript.jsonl
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

    // 2. Read recent Pi turns in this conversation
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

function startPiRun(sendToPage, params) {
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

  const emitEvent = (evt) => {
    const expr = `window.__agyPiStreamEvent && window.__agyPiStreamEvent(${JSON.stringify(evt)});`;
    sendToPage("Runtime.evaluate", { expression: expr, returnByValue: true });
  };

  let fullResponse = "";
  const toolsExecuted = [];

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
          emitEvent({
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
        emitEvent({
          runId,
          turnId,
          conversationId,
          type: "tool_start",
          toolName,
          summary
        });
      } else if (j.type === "tool_execution_end") {
        const toolName = j.toolName || "tool";
        emitEvent({
          runId,
          turnId,
          conversationId,
          type: "tool_end",
          toolName
        });
      } else if (j.type === "agent_end" && !fullResponse && Array.isArray(j.messages)) {
        // Fallback if response wasn't emitted via text_delta
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
    emitEvent({
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
    emitEvent({
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
    const parsed = JSON.parse(rawStr);
    const dir = path.dirname(TAGS_JSON_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(TAGS_JSON_FILE, JSON.stringify(parsed, null, 2), "utf8");
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
    if (cmd === "listDir") {
      resObj.data = listDirectoryEntries(args.dirPath);
    } else if (cmd === "revealInFinder") {
      resObj.data = revealInFinder(args.targetPath);
    } else if (cmd === "openDefault") {
      resObj.data = openWithDefaultApp(args.targetPath);
    } else if (cmd === "getPiModels") {
      resObj.data = loadPiModelsConfig();
    } else if (cmd === "getPiTurns") {
      resObj.data = loadPiTurnsForConversation(args.conversationId);
    } else if (cmd === "runPiPrompt") {
      resObj.data = startPiRun(send, args);
    } else if (cmd === "stopPiRun") {
      resObj.data = stopPiRun(args.runId);
    } else {
      resObj = { ok: false, error: `Unknown command: ${cmd}` };
    }
  } catch (err) {
    resObj = { ok: false, error: err.message || String(err) };
  }

  const expr = `window.__agyBridgeResolve && window.__agyBridgeResolve(${JSON.stringify(reqId)}, ${JSON.stringify(resObj)});`;
  send("Runtime.evaluate", { expression: expr, returnByValue: true });
}

function buildPayloadScript() {
  const cfg = readConfigJson();
  const injectCode = fs.readFileSync(INJECT_JS_FILE, "utf8");
  const cfgPrefix = cfg
    ? `window.__AGY_INITIAL_PROJECT_TAGS__ = ${JSON.stringify(cfg)};\n`
    : "";
  return cfgPrefix + injectCode;
}

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
    const source = buildPayloadScript();
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
        const source = buildPayloadScript();
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
      : buildPayloadScript();

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

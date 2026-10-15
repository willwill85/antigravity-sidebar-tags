const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFile } = require("child_process");

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

const INJECT_JS_FILE = path.join(__dirname, "inject.js");
const attachedTargets = new Map(); // targetId -> WebSocket

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
  attachedTargets.set(target.id, ws);
  let msgId = 1;

  const send = (method, params = {}) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ id: msgId++, method, params }));
    }
  };

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
  console.log("[sidebar-tags] Starting Antigravity Sidebar Tags & Files daemon...");
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

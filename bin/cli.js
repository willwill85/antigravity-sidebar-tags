#!/usr/bin/env node
/**
 * Antigravity Sidebar Tags CLI
 *
 * Commands:
 *   install   - Install background auto-injector daemon & inject into open windows immediately
 *   uninstall - Stop background daemon & remove tag bar from open windows
 *   inject    - One-shot inject into currently open Antigravity windows
 *   status    - Check Antigravity CDP status and daemon status
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");
const {
  startDaemon,
  runOnce,
  readActivePort,
  discoverPageTargets,
  TAGS_JSON_FILE
} = require("../src/daemon");

const INSTALL_DIR = path.join(os.homedir(), ".agy-sidebar-tags");
const PLIST_LABEL = "com.antigravity.sidebar-tags";
const PLIST_PATH = path.join(os.homedir(), "Library/LaunchAgents", `${PLIST_LABEL}.plist`);
const SYSTEMD_PATH = path.join(os.homedir(), ".config/systemd/user/antigravity-sidebar-tags.service");

function copyRuntimeFiles() {
  fs.mkdirSync(INSTALL_DIR, { recursive: true });
  fs.copyFileSync(path.join(__dirname, "../src/inject.js"), path.join(INSTALL_DIR, "inject.js"));
  fs.copyFileSync(path.join(__dirname, "../src/daemon.js"), path.join(INSTALL_DIR, "daemon.js"));
}

function installMacLaunchAgent() {
  const nodeBin = process.execPath;
  const daemonScript = path.join(INSTALL_DIR, "daemon.js");
  const logFile = path.join(INSTALL_DIR, "daemon.log");

  const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${PLIST_LABEL}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${nodeBin}</string>
        <string>${daemonScript}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${logFile}</string>
    <key>StandardErrorPath</key>
    <string>${logFile}</string>
</dict>
</plist>
`;
  fs.mkdirSync(path.dirname(PLIST_PATH), { recursive: true });
  fs.writeFileSync(PLIST_PATH, plistContent, "utf8");
  try {
    execSync(`launchctl unload "${PLIST_PATH}" 2>/dev/null || true`);
    execSync(`launchctl load "${PLIST_PATH}"`);
  } catch (e) {}
}

function installLinuxSystemd() {
  const nodeBin = process.execPath;
  const daemonScript = path.join(INSTALL_DIR, "daemon.js");
  const unit = `[Unit]
Description=Antigravity Sidebar Tags Auto-Injector
After=default.target

[Service]
ExecStart="${nodeBin}" "${daemonScript}"
Restart=always
RestartSec=3

[Install]
WantedBy=default.target
`;
  fs.mkdirSync(path.dirname(SYSTEMD_PATH), { recursive: true });
  fs.writeFileSync(SYSTEMD_PATH, unit, "utf8");
  try {
    execSync("systemctl --user daemon-reload && systemctl --user enable --now antigravity-sidebar-tags.service");
  } catch (e) {}
}

async function cmdInstall() {
  console.log("🚀 Installing Antigravity Sidebar Tags...");
  copyRuntimeFiles();

  if (process.platform === "darwin") {
    installMacLaunchAgent();
    console.log(`✅ Installed macOS LaunchAgent: ${PLIST_PATH}`);
  } else if (process.platform === "linux") {
    installLinuxSystemd();
    console.log(`✅ Installed Linux systemd user service: ${SYSTEMD_PATH}`);
  } else {
    console.log(`✅ Copied runtime files to: ${INSTALL_DIR}`);
    console.log(`💡 Run \`node "${path.join(INSTALL_DIR, "daemon.js")}"\` in background.`);
  }

  const { count } = await runOnce("inject");
  if (count > 0) {
    console.log(`✨ Live-injected into ${count} running Antigravity window(s)! Check your left sidebar.`);
  } else {
    console.log("ℹ️  Antigravity is not currently open (or no active window found). The daemon will automatically inject as soon as you open Antigravity.");
  }
  console.log(`📁 Tag configuration path: ${TAGS_JSON_FILE}`);
}

async function cmdUninstall() {
  console.log("🧹 Uninstalling Antigravity Sidebar Tags...");
  if (process.platform === "darwin" && fs.existsSync(PLIST_PATH)) {
    try {
      execSync(`launchctl unload "${PLIST_PATH}" 2>/dev/null || true`);
      fs.unlinkSync(PLIST_PATH);
      console.log("✅ Removed macOS LaunchAgent.");
    } catch (e) {}
  } else if (process.platform === "linux" && fs.existsSync(SYSTEMD_PATH)) {
    try {
      execSync("systemctl --user disable --now antigravity-sidebar-tags.service 2>/dev/null || true");
      fs.unlinkSync(SYSTEMD_PATH);
      console.log("✅ Removed Linux systemd service.");
    } catch (e) {}
  }

  const { count } = await runOnce("uninstall");
  if (count > 0) {
    console.log(`✅ Removed tag UI and restored full project list in ${count} open window(s).`);
  }
  console.log(`ℹ️  Your saved tags in ${TAGS_JSON_FILE} were preserved.`);
}

async function cmdStatus() {
  const active = readActivePort();
  const targets = await discoverPageTargets();
  console.log("=== Antigravity Sidebar Tags Status ===");
  console.log(`Config File : ${TAGS_JSON_FILE} (${fs.existsSync(TAGS_JSON_FILE) ? "exists" : "will be created on first tag change"})`);
  console.log(`CDP Port    : ${active ? `${active.port} (${active.file})` : "Not detected (is Antigravity running?)"}`);
  console.log(`Open Windows: ${targets.length}`);
}

async function main() {
  const sub = process.argv[2] || "install";
  if (sub === "install") {
    await cmdInstall();
  } else if (sub === "uninstall" || sub === "remove") {
    await cmdUninstall();
  } else if (sub === "inject") {
    const { count } = await runOnce("inject");
    console.log(`✨ Injected into ${count} Antigravity window(s).`);
  } else if (sub === "status") {
    await cmdStatus();
  } else if (sub === "daemon") {
    startDaemon();
  } else {
    console.log("Usage: antigravity-sidebar-tags [install|uninstall|inject|status|daemon]");
  }
}

main();

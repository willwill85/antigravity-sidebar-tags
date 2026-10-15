(() => {
  const INSTANCE_VERSION = 5;
  const STORAGE_KEY = "agy_project_tags_v1";
  const FILES_PANEL_STATE_KEY = "agy_files_panel_state_v1";
  const PI_ENGINE_STATE_KEY = "agy_pi_engine_state_v1";
  const PRESET_COLORS = [
    "#2563eb", // Blue
    "#db2777", // Pink
    "#d97706", // Amber
    "#059669", // Emerald
    "#7c3aed", // Violet
    "#dc2626", // Red
    "#0891b2", // Cyan
    "#4f46e5"  // Indigo
  ];

  if (window.__AGY_TAG_NAV_INSTANCE__) {
    if (window.__AGY_TAG_NAV_INSTANCE__.version === INSTANCE_VERSION) {
      if (window.__AGY_INITIAL_PROJECT_TAGS__ && !localStorage.getItem(STORAGE_KEY)) {
        window.__AGY_TAG_NAV_INSTANCE__.setConfig(window.__AGY_INITIAL_PROJECT_TAGS__);
      }
      window.__AGY_TAG_NAV_INSTANCE__.refreshAll();
      return "already_active_refreshed_v4";
    }
    try {
      if (typeof window.__AGY_TAG_NAV_INSTANCE__._cleanupForUpgrade === "function") {
        window.__AGY_TAG_NAV_INSTANCE__._cleanupForUpgrade();
      } else if (typeof window.__AGY_TAG_NAV_INSTANCE__.uninstall === "function") {
        window.__AGY_TAG_NAV_INSTANCE__.uninstall();
      }
    } catch (e) {}
    delete window.__AGY_TAG_NAV_INSTANCE__;
  }

  // --- Bridge RPC to Node Daemon ---
  let bridgeReqSeq = 1;
  const pendingBridgeCalls = new Map();

  window.__agyBridgeResolve = function(reqId, resObj) {
    const p = pendingBridgeCalls.get(reqId);
    if (p) {
      pendingBridgeCalls.delete(reqId);
      clearTimeout(p.timer);
      if (resObj && resObj.ok) {
        p.resolve(resObj.data);
      } else {
        p.reject(new Error(resObj?.error || "Bridge call failed"));
      }
    }
  };

  function callBridge(cmd, args = {}) {
    return new Promise((resolve, reject) => {
      if (typeof window.__agyBridgeCall !== "function") {
        reject(new Error("Daemon bridge (__agyBridgeCall) not connected"));
        return;
      }
      const reqId = `req_${Date.now()}_${bridgeReqSeq++}`;
      const timer = setTimeout(() => {
        pendingBridgeCalls.delete(reqId);
        reject(new Error("Bridge call timed out"));
      }, 6000);
      pendingBridgeCalls.set(reqId, { resolve, reject, timer });
      try {
        window.__agyBridgeCall(JSON.stringify({ reqId, cmd, args }));
      } catch (e) {
        clearTimeout(timer);
        pendingBridgeCalls.delete(reqId);
        reject(e);
      }
    });
  }

  // --- Config State ---
  function loadInitialConfig() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.tags) && parsed.projectTags) {
          return parsed;
        }
      }
    } catch (e) {}
    if (window.__AGY_INITIAL_PROJECT_TAGS__) {
      return JSON.parse(JSON.stringify(window.__AGY_INITIAL_PROJECT_TAGS__));
    }
    return {
      version: 1,
      activeTag: "all",
      tags: [
        { id: "hardware", name: "硬件/固件", color: "#2563eb" },
        { id: "design", name: "包装/设计", color: "#db2777" },
        { id: "media", name: "AI媒体", color: "#d97706" },
        { id: "software", name: "软件/Web", color: "#059669" },
        { id: "data", name: "算法/数据", color: "#7c3aed" }
      ],
      projectTags: {}
    };
  }

  function loadFilesPanelState() {
    try {
      const raw = localStorage.getItem(FILES_PANEL_STATE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        return {
          height: Math.min(520, Math.max(110, Number(p.height) || 220)),
          collapsed: Boolean(p.collapsed)
        };
      }
    } catch (e) {}
    return { height: 220, collapsed: false };
  }

  function loadPiEngineState() {
    try {
      const raw = localStorage.getItem(PI_ENGINE_STATE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        return {
          engine: p.engine === "pi" ? "pi" : "agy",
          model: p.model || "surplus/claude-haiku-5.5"
        };
      }
    } catch (e) {}
    return { engine: "agy", model: "surplus/claude-haiku-5.5" };
  }

  let state = loadInitialConfig();
  if (!state.activeTag) state.activeTag = "all";
  let filesPanelPrefs = loadFilesPanelState();
  let piEngineState = loadPiEngineState();
  let piModelsCatalog = []; // Array<{ fullId, provider, id, name }>

  function saveFilesPanelPrefs() {
    try {
      localStorage.setItem(FILES_PANEL_STATE_KEY, JSON.stringify(filesPanelPrefs));
    } catch (e) {}
  }

  function savePiEngineState() {
    try {
      localStorage.setItem(PI_ENGINE_STATE_KEY, JSON.stringify(piEngineState));
    } catch (e) {}
  }

  function saveState() {
    const json = JSON.stringify(state);
    try {
      localStorage.setItem(STORAGE_KEY, json);
    } catch (e) {}
    try {
      if (window.nativeStorage && typeof window.nativeStorage.updateItems === "function") {
        window.nativeStorage.updateItems({ [STORAGE_KEY]: json });
      }
    } catch (e) {}
    try {
      if (typeof window.__agySaveProjectTags === "function") {
        window.__agySaveProjectTags(json);
      }
    } catch (e) {}
  }

  // --- Styles ---
  function ensureStyles() {
    let styleEl = document.getElementById("agy-project-tags-style");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "agy-project-tags-style";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
      #agy-project-tags-bar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 4px;
        padding: 2px 10px 6px 10px;
        user-select: none;
        flex-shrink: 0;
      }
      .agy-tag-pill {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        height: 22px;
        padding: 0 7px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 500;
        line-height: 1;
        cursor: pointer;
        border: 1px solid rgba(128, 128, 128, 0.2);
        background: rgba(128, 128, 128, 0.07);
        color: inherit;
        opacity: 0.78;
        transition: all 0.14s ease;
        white-space: nowrap;
      }
      .agy-tag-pill:hover {
        opacity: 1;
        background: rgba(128, 128, 128, 0.15);
      }
      .agy-tag-pill.active {
        opacity: 1;
        font-weight: 600;
        background: var(--agy-pill-bg, rgba(37, 99, 235, 0.14));
        border-color: var(--agy-pill-color, #2563eb);
        color: var(--agy-pill-color, #2563eb);
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      }
      .agy-tag-dot {
        width: 6px;
        height: 6px;
        border-radius: 999px;
        flex-shrink: 0;
      }
      .agy-tag-count {
        font-size: 10px;
        opacity: 0.65;
        font-variant-numeric: tabular-nums;
      }
      .agy-proj-badges {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        margin-left: 4px;
        flex-shrink: 0;
      }
      .agy-proj-badge {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        height: 16px;
        padding: 0 5px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 500;
        line-height: 1;
        white-space: nowrap;
        cursor: pointer;
        border: 1px solid transparent;
        transition: filter 0.12s ease, transform 0.12s ease;
      }
      .agy-proj-badge:hover {
        filter: brightness(0.95);
        transform: translateY(-0.5px);
      }
      .agy-proj-tag-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border-radius: 5px;
        border: none;
        background: transparent;
        color: inherit;
        opacity: 0.65;
        cursor: pointer;
        padding: 0;
      }
      .agy-proj-tag-btn:hover {
        opacity: 1;
        background: rgba(128, 128, 128, 0.15);
      }
      #agy-tag-popover, #agy-file-ctx-menu, #agy-pi-model-popover {
        position: fixed;
        z-index: 99999;
        border-radius: 10px;
        background: var(--popover, #ffffff);
        color: var(--popover-foreground, #111827);
        border: 1px solid rgba(128, 128, 128, 0.24);
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18), 0 2px 6px rgba(0, 0, 0, 0.08);
        font-size: 12px;
        user-select: none;
      }
      #agy-tag-popover {
        width: 236px;
        padding: 10px;
      }
      #agy-file-ctx-menu {
        min-width: 188px;
        padding: 5px;
      }
      #agy-pi-model-popover {
        width: 280px;
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      html[style*="dark"] #agy-tag-popover,
      html[style*="dark"] #agy-file-ctx-menu,
      html[style*="dark"] #agy-pi-model-popover {
        background: #1e1f23;
        color: #f3f4f6;
        border-color: rgba(255, 255, 255, 0.14);
      }
      .agy-pop-title {
        font-size: 11px;
        font-weight: 600;
        opacity: 0.7;
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .agy-pop-list {
        display: flex;
        flex-direction: column;
        gap: 3px;
        max-height: 180px;
        overflow-y: auto;
        margin-bottom: 8px;
      }
      .agy-pop-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 5px 7px;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.1s ease;
      }
      .agy-pop-item:hover {
        background: rgba(128, 128, 128, 0.12);
      }
      .agy-pop-item-left {
        display: flex;
        align-items: center;
        gap: 7px;
        min-width: 0;
      }
      .agy-pop-check {
        width: 14px;
        height: 14px;
        border-radius: 4px;
        border: 1.5px solid rgba(128, 128, 128, 0.45);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        flex-shrink: 0;
      }
      .agy-pop-check.checked {
        background: #2563eb;
        border-color: #2563eb;
        color: #fff;
      }
      .agy-pop-del {
        border: none;
        background: transparent;
        color: inherit;
        opacity: 0.35;
        cursor: pointer;
        font-size: 12px;
        padding: 0 3px;
        border-radius: 4px;
      }
      .agy-pop-del:hover {
        opacity: 0.9;
        color: #ef4444;
        background: rgba(239, 68, 68, 0.1);
      }
      .agy-pop-create {
        border-top: 1px solid rgba(128, 128, 128, 0.16);
        padding-top: 8px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .agy-pop-input-row {
        display: flex;
        gap: 5px;
      }
      .agy-pop-input {
        flex: 1;
        min-width: 0;
        height: 26px;
        padding: 0 8px;
        border-radius: 6px;
        border: 1px solid rgba(128, 128, 128, 0.3);
        background: transparent;
        color: inherit;
        font-size: 12px;
        outline: none;
      }
      .agy-pop-input:focus {
        border-color: #2563eb;
      }
      .agy-pop-add-btn {
        height: 26px;
        padding: 0 9px;
        border-radius: 6px;
        border: none;
        background: #2563eb;
        color: #fff;
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
        white-space: nowrap;
      }
      .agy-pop-colors {
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .agy-color-swatch {
        width: 15px;
        height: 15px;
        border-radius: 999px;
        cursor: pointer;
        border: 2px solid transparent;
        transition: transform 0.1s ease;
      }
      .agy-color-swatch.selected {
        border-color: currentColor;
        transform: scale(1.15);
      }

      /* --- Project Files Browser Panel --- */
      #agy-project-files-panel {
        display: flex;
        flex-direction: column;
        flex-shrink: 0;
        margin: 0 8px 4px 8px;
        border-radius: 8px;
        border: 1px solid rgba(128, 128, 128, 0.18);
        background: rgba(128, 128, 128, 0.04);
        overflow: hidden;
        user-select: none;
      }
      #agy-files-resizer {
        height: 5px;
        cursor: ns-resize;
        width: 100%;
        flex-shrink: 0;
        background: transparent;
        transition: background 0.12s ease;
      }
      #agy-files-resizer:hover, #agy-files-resizer.dragging {
        background: rgba(37, 99, 235, 0.35);
      }
      .agy-files-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 4px 8px 5px 8px;
        border-bottom: 1px solid rgba(128, 128, 128, 0.12);
        font-size: 11.5px;
        font-weight: 600;
        gap: 6px;
        flex-shrink: 0;
      }
      #agy-project-files-panel.collapsed .agy-files-header {
        border-bottom: none;
      }
      .agy-files-header-left {
        display: flex;
        align-items: center;
        gap: 5px;
        min-width: 0;
        flex: 1;
        cursor: pointer;
      }
      .agy-files-proj-badge {
        display: inline-block;
        padding: 1px 6px;
        border-radius: 4px;
        font-size: 10.5px;
        font-weight: 500;
        background: rgba(37, 99, 235, 0.12);
        color: #2563eb;
        max-width: 140px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      html[style*="dark"] .agy-files-proj-badge {
        background: rgba(59, 130, 246, 0.2);
        color: #60a5fa;
      }
      .agy-files-actions {
        display: flex;
        align-items: center;
        gap: 2px;
        flex-shrink: 0;
      }
      .agy-files-icon-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border-radius: 5px;
        border: none;
        background: transparent;
        color: inherit;
        opacity: 0.65;
        cursor: pointer;
        padding: 0;
        font-size: 12px;
      }
      .agy-files-icon-btn:hover {
        opacity: 1;
        background: rgba(128, 128, 128, 0.15);
      }
      #agy-files-tree {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 4px 4px;
        font-size: 12px;
      }
      #agy-project-files-panel.collapsed #agy-files-tree,
      #agy-project-files-panel.collapsed #agy-files-resizer {
        display: none;
      }
      .agy-file-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 24px;
        padding-right: 6px;
        border-radius: 5px;
        cursor: pointer;
        color: inherit;
        transition: background 0.08s ease;
        white-space: nowrap;
      }
      .agy-file-row:hover {
        background: rgba(128, 128, 128, 0.11);
      }
      .agy-file-row.selected {
        background: rgba(37, 99, 235, 0.15);
        color: #2563eb;
        font-weight: 500;
      }
      html[style*="dark"] .agy-file-row.selected {
        background: rgba(59, 130, 246, 0.24);
        color: #93c5fd;
      }
      .agy-file-row-left {
        display: flex;
        align-items: center;
        gap: 5px;
        min-width: 0;
        flex: 1;
        overflow: hidden;
      }
      .agy-file-caret {
        width: 12px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 9px;
        opacity: 0.6;
        flex-shrink: 0;
      }
      .agy-file-icon {
        font-size: 12.5px;
        line-height: 1;
        flex-shrink: 0;
      }
      .agy-file-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 12px;
      }
      .agy-file-meta {
        font-size: 10px;
        opacity: 0.48;
        margin-left: 6px;
        flex-shrink: 0;
        font-variant-numeric: tabular-nums;
      }
      .agy-file-opened-pill {
        font-size: 9.5px;
        padding: 1px 5px;
        border-radius: 4px;
        background: rgba(5, 150, 105, 0.16);
        color: #059669;
        font-weight: 600;
        margin-left: 4px;
        flex-shrink: 0;
      }
      .agy-files-empty {
        padding: 14px 10px;
        text-align: center;
        font-size: 11.5px;
        opacity: 0.55;
      }
      .agy-ctx-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 9px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        transition: background 0.1s ease;
      }
      .agy-ctx-item:hover {
        background: rgba(37, 99, 235, 0.12);
        color: #2563eb;
      }
      html[style*="dark"] .agy-ctx-item:hover {
        background: rgba(59, 130, 246, 0.22);
        color: #93c5fd;
      }
      .agy-ctx-sep {
        height: 1px;
        margin: 4px 4px;
        background: rgba(128, 128, 128, 0.16);
      }

      /* --- AGY / Pi Dual-Engine Selector & Chat UI --- */
      #agy-pi-engine-bar {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        margin-right: 4px;
        user-select: none;
      }
      .agy-engine-switch {
        display: inline-flex;
        align-items: center;
        height: 26px;
        padding: 2px;
        border-radius: 999px;
        background: rgba(128, 128, 128, 0.12);
        border: 1px solid rgba(128, 128, 128, 0.18);
      }
      .agy-engine-opt {
        border: none;
        background: transparent;
        color: inherit;
        font-size: 11px;
        font-weight: 500;
        height: 20px;
        padding: 0 8px;
        border-radius: 999px;
        cursor: pointer;
        opacity: 0.7;
        transition: all 0.14s ease;
        display: inline-flex;
        align-items: center;
        gap: 3px;
        white-space: nowrap;
      }
      .agy-engine-opt:hover {
        opacity: 1;
      }
      .agy-engine-opt.active-agy {
        opacity: 1;
        font-weight: 600;
        background: #2563eb;
        color: #ffffff;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
      }
      .agy-engine-opt.active-pi {
        opacity: 1;
        font-weight: 600;
        background: #7c3aed;
        color: #ffffff;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
      }
      #agy-pi-model-trigger {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        height: 26px;
        padding: 0 9px;
        border-radius: 999px;
        font-size: 11.5px;
        font-weight: 600;
        border: 1px solid rgba(124, 58, 237, 0.35);
        background: rgba(124, 58, 237, 0.1);
        color: #7c3aed;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.12s ease;
      }
      html[style*="dark"] #agy-pi-model-trigger {
        background: rgba(139, 92, 246, 0.2);
        color: #c4b5fd;
        border-color: rgba(139, 92, 246, 0.4);
      }
      #agy-pi-model-trigger:hover {
        background: rgba(124, 58, 237, 0.18);
      }
      #agy-pi-send-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        height: 26px;
        padding: 0 10px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
        border: none;
        background: #7c3aed;
        color: #ffffff;
        cursor: pointer;
        white-space: nowrap;
        transition: opacity 0.12s ease;
      }
      #agy-pi-send-btn:hover {
        opacity: 0.92;
      }
      .agy-pi-mode-card-ring {
        box-shadow: 0 0 0 1.5px rgba(124, 58, 237, 0.45) !important;
      }
      .agy-pi-model-group-title {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        opacity: 0.55;
        padding: 4px 6px 2px 6px;
      }
      .agy-pi-model-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 5px 8px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
      }
      .agy-pi-model-item:hover {
        background: rgba(124, 58, 237, 0.12);
      }
      .agy-pi-model-item.selected {
        background: rgba(124, 58, 237, 0.16);
        color: #7c3aed;
        font-weight: 600;
      }
      html[style*="dark"] .agy-pi-model-item.selected {
        color: #c4b5fd;
      }

      /* --- Pi Conversation Stream Cards --- */
      #agy-pi-turns-container {
        display: flex;
        flex-direction: column;
        gap: 14px;
        width: 100%;
        max-width: 768px;
        margin: 12px auto 20px auto;
        padding: 0 16px;
      }
      .agy-pi-turn-card {
        display: flex;
        flex-direction: column;
        gap: 8px;
        border-radius: 12px;
        border: 1px solid rgba(124, 58, 237, 0.25);
        background: rgba(124, 58, 237, 0.03);
        padding: 12px 14px;
      }
      .agy-pi-user-bubble {
        align-self: flex-end;
        background: rgba(128, 128, 128, 0.12);
        padding: 7px 12px;
        border-radius: 12px 12px 3px 12px;
        font-size: 13.5px;
        max-width: 88%;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .agy-pi-assistant-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        font-size: 11.5px;
      }
      .agy-pi-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 2px 8px;
        border-radius: 999px;
        font-weight: 600;
        background: rgba(124, 58, 237, 0.14);
        color: #7c3aed;
      }
      html[style*="dark"] .agy-pi-badge {
        background: rgba(139, 92, 246, 0.22);
        color: #c4b5fd;
      }
      .agy-pi-ctx-pill {
        font-size: 10.5px;
        opacity: 0.65;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .agy-pi-tools-list {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
      }
      .agy-pi-tool-pill {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        padding: 2px 7px;
        border-radius: 5px;
        background: rgba(128, 128, 128, 0.1);
        border: 1px solid rgba(128, 128, 128, 0.16);
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .agy-pi-response-body {
        font-size: 13.5px;
        line-height: 1.6;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .agy-pi-stop-btn {
        border: 1px solid rgba(239, 68, 68, 0.4);
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
        border-radius: 6px;
        padding: 1px 7px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
      }
    `;
  }

  // --- React Providers Hook ---
  let cachedPmf = null;
  let cachedRpp = null;
  let cachedSsp = null;
  let cachedEnf = null;

  function findReactProviders() {
    const el = document.querySelector('[data-testid="conversation-list-sidebar"]');
    if (!el) return null;
    if (cachedRpp && cachedPmf && cachedSsp) {
      return { pmf: cachedPmf, rpp: cachedRpp, ssp: cachedSsp, enf: cachedEnf };
    }
    const fiberKey = Object.keys(el).find(k => k.startsWith("__reactFiber$"));
    if (!fiberKey) return null;
    let cur = el[fiberKey];
    while (cur) {
      const v = cur.memoizedProps?.value;
      if (v) {
        if (v.projectManagementFeature?.richProjectsProvider) {
          cachedPmf = v.projectManagementFeature;
          cachedRpp = cachedPmf.richProjectsProvider;
        }
        if (v.sidebarSectionsProvider) {
          cachedSsp = v.sidebarSectionsProvider;
        }
        if (v.electronNativeFeature) {
          cachedEnf = v.electronNativeFeature;
        }
      }
      cur = cur.return;
    }
    if (!cachedRpp) return null;
    hookRichProjectsProvider(cachedPmf, cachedRpp);
    return { pmf: cachedPmf, rpp: cachedRpp, ssp: cachedSsp, enf: cachedEnf };
  }

  function doesProjectMatchTag(projectId, activeTag) {
    if (!activeTag || activeTag === "all") return true;
    const assigned = state.projectTags[projectId] || [];
    const validTagIds = new Set(state.tags.map(t => t.id));
    const validAssigned = assigned.filter(id => validTagIds.has(id));
    if (activeTag === "__untagged__") {
      return validAssigned.length === 0;
    }
    return validAssigned.includes(activeTag);
  }

  function hookRichProjectsProvider(pmf, rpp) {
    if (!rpp.__agyTagHooked) {
      rpp.__agyTagHooked = true;
      rpp._origSetState = rpp.setState.bind(rpp);
      const clean = new Map();
      for (const [k, v] of rpp.state.entries()) {
        clean.set(k, v._origItem || v);
      }
      rpp._rawState = clean;

      rpp.setState = function(newMap) {
        if (newMap && newMap.__isAgyTagFilteredMap) {
          return rpp._origSetState(newMap);
        }
        const nextRaw = new Map();
        for (const [k, v] of newMap.entries()) {
          nextRaw.set(k, v._origItem || v);
        }
        rpp._rawState = nextRaw;
        applyTagFilterToRpp(rpp);
      };

      if (pmf && typeof pmf.updateProject === "function" && !pmf.__agyUpdateGuarded) {
        pmf.__agyUpdateGuarded = true;
        const origUpdate = pmf.updateProject.bind(pmf);
        pmf.updateProject = async function(proj, files) {
          const rawItem = rpp._rawState?.get(proj?.id);
          if (rawItem && !rawItem.project?.archived && proj?.archived === false && (!files || files.length === 0)) {
            const curFiltered = rpp.state?.get(proj.id);
            if (curFiltered?._tagFiltered) {
              return;
            }
          }
          return origUpdate(proj, files);
        };
      }
    }
  }

  function applyTagFilterToRpp(rpp) {
    if (!rpp || !rpp._rawState) return;
    const activeTag = state.activeTag || "all";
    const rawMap = rpp._rawState;
    if (activeTag === "all") {
      rpp._origSetState(rawMap);
      return;
    }
    const filteredMap = new Map();
    filteredMap.__isAgyTagFilteredMap = true;
    for (const [k, v] of rawMap.entries()) {
      const orig = v._origItem || v;
      if (orig.project?.archived) {
        filteredMap.set(k, orig);
        continue;
      }
      if (doesProjectMatchTag(k, activeTag)) {
        filteredMap.set(k, orig);
      } else {
        filteredMap.set(k, {
          ...orig,
          _origItem: orig,
          _tagFiltered: true,
          project: { ...orig.project, archived: true }
        });
      }
    }
    rpp._origSetState(filteredMap);
  }

  function fileUriToPath(uri) {
    if (!uri || typeof uri !== "string") return null;
    try {
      if (uri.startsWith("file://")) {
        const u = new URL(uri);
        let p = decodeURIComponent(u.pathname);
        if (/^\/[A-Za-z]:\//.test(p)) {
          p = p.slice(1);
        }
        return p;
      }
      return uri;
    } catch (e) {
      return null;
    }
  }

  function extractProjectFolderUri(projObj) {
    const resources = projObj?.projectResources?.resources || [];
    for (const r of resources) {
      if (r?.type?.case === "folderUri" && r.type.value) {
        return r.type.value;
      }
      if (r?.type?.case === "gitFolder" && r.type.value?.folderUri) {
        return r.type.value.folderUri;
      }
    }
    return null;
  }

  function getActiveProjectsList() {
    const found = findReactProviders();
    if (!found || !found.rpp._rawState) return [];
    const list = [];
    for (const [k, v] of found.rpp._rawState.entries()) {
      const orig = v._origItem || v;
      if (k === "outside-of-project" || orig.project?.archived) continue;
      const uri = extractProjectFolderUri(orig.project);
      list.push({
        id: k,
        name: orig.project?.name || k,
        folderUri: uri,
        folderPath: fileUriToPath(uri)
      });
    }
    return list;
  }

  let manualSelectedProjectId = null;

  function getCurrentConversationId() {
    const m = window.location.pathname.match(/^\/c\/([^/?#]+)/);
    return m ? m[1] : null;
  }

  function detectCurrentActiveProject() {
    const found = findReactProviders();
    if (!found || !found.rpp._rawState) return null;
    const rawMap = found.rpp._rawState;

    const getProjectById = (pid) => {
      if (!pid || !rawMap.has(pid)) return null;
      const orig = rawMap.get(pid)._origItem || rawMap.get(pid);
      if (!orig?.project) return null;
      const uri = extractProjectFolderUri(orig.project);
      const folderPath = fileUriToPath(uri);
      if (!folderPath) return null;
      return {
        id: pid,
        name: orig.project.name || pid,
        folderUri: uri,
        folderPath
      };
    };

    try {
      const params = new URLSearchParams(window.location.search);
      const sec = params.get("section");
      const bySec = getProjectById(sec);
      if (bySec) return bySec;
    } catch (e) {}

    const pMatch = window.location.pathname.match(/^\/p\/([^/?#]+)/);
    if (pMatch) {
      const byP = getProjectById(pMatch[1]);
      if (byP) return byP;
    }

    const convId = getCurrentConversationId();
    if (convId && found.ssp) {
      if (found.ssp.conversationsByProject instanceof Map) {
        for (const [pid, convList] of found.ssp.conversationsByProject.entries()) {
          if (Array.isArray(convList) && convList.some(c => c.cascadeId === convId || c.conversation?.conversationId === convId)) {
            const byConvProj = getProjectById(pid);
            if (byConvProj) return byConvProj;
            const matchedConv = convList.find(c => c.cascadeId === convId || c.conversation?.conversationId === convId);
            if (matchedConv?.workspaceUriStr) {
              const fp = fileUriToPath(matchedConv.workspaceUriStr);
              if (fp) {
                return {
                  id: pid,
                  name: fp.split("/").filter(Boolean).pop() || "Workspace",
                  folderUri: matchedConv.workspaceUriStr,
                  folderPath: fp
                };
              }
            }
          }
        }
      }
    }

    if (manualSelectedProjectId) {
      const byManual = getProjectById(manualSelectedProjectId);
      if (byManual) return byManual;
    }

    const allProjs = getActiveProjectsList();
    return allProjs.find(p => p.folderPath) || null;
  }

  // --- Project Files Browser State & Rendering ---
  let currentFilesProject = null;
  const expandedDirs = new Set();
  const dirEntriesCache = new Map();
  let selectedFilePath = null;
  let recentlyOpenedPath = null;

  function formatFileSize(bytes) {
    if (!bytes || bytes <= 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getFileIcon(name, isDir, isExpanded) {
    if (isDir) return isExpanded ? "📂" : "📁";
    const ext = (name.split(".").pop() || "").toLowerCase();
    if (["js", "jsx", "ts", "tsx", "py", "c", "cpp", "h", "rs", "go", "java", "sh", "zsh"].includes(ext)) return "📄";
    if (["json", "yaml", "yml", "toml", "ini", "env", "plist", "xml"].includes(ext)) return "⚙️";
    if (["md", "txt", "rtf", "log"].includes(ext)) return "📝";
    if (["png", "jpg", "jpeg", "gif", "svg", "webp", "ico"].includes(ext)) return "🖼️";
    if (["pdf"].includes(ext)) return "📕";
    if (["csv", "xlsx", "xls", "parquet", "db", "sqlite"].includes(ext)) return "📊";
    if (["mp3", "wav", "mp4", "mov", "mkv"].includes(ext)) return "🎬";
    if (["zip", "tar", "gz", "7z", "rar", "dmg"].includes(ext)) return "📦";
    if (["html", "css", "scss"].includes(ext)) return "🌐";
    return "📄";
  }

  async function loadDirEntries(dirPath, forceRefresh = false) {
    if (!forceRefresh && dirEntriesCache.has(dirPath)) {
      return dirEntriesCache.get(dirPath);
    }
    try {
      const entries = await callBridge("listDir", { dirPath });
      dirEntriesCache.set(dirPath, entries || []);
      return entries || [];
    } catch (e) {
      return [];
    }
  }

  async function refreshProjectFiles(forceReload = false) {
    const activeProj = detectCurrentActiveProject();
    const projectChanged =
      !currentFilesProject ||
      !activeProj ||
      currentFilesProject.id !== activeProj.id ||
      currentFilesProject.folderPath !== activeProj.folderPath;

    if (projectChanged) {
      currentFilesProject = activeProj;
      if (forceReload) {
        dirEntriesCache.clear();
      }
    } else if (forceReload) {
      dirEntriesCache.clear();
    }

    ensureFilesPanelDom();
    await renderFilesTree(projectChanged || forceReload);
  }

  function ensureFilesPanelDom() {
    const listEl = document.querySelector('[data-testid="conversation-list-sidebar"]');
    if (!listEl) return null;
    const p2 = listEl.parentElement?.parentElement;
    const p3 = p2?.parentElement;
    if (!p2 || !p3) return null;

    let panel = document.getElementById("agy-project-files-panel");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "agy-project-files-panel";
      if (filesPanelPrefs.collapsed) {
        panel.classList.add("collapsed");
      } else {
        panel.style.height = `${filesPanelPrefs.height}px`;
      }

      const resizer = document.createElement("div");
      resizer.id = "agy-files-resizer";
      resizer.title = "上下拖动调整 Files 窗口高度";
      resizer.onmousedown = (e) => {
        e.preventDefault();
        resizer.classList.add("dragging");
        const startY = e.clientY;
        const startH = panel.getBoundingClientRect().height;
        const onMove = (me) => {
          const delta = startY - me.clientY;
          const nextH = Math.min(520, Math.max(110, startH + delta));
          filesPanelPrefs.height = Math.round(nextH);
          panel.style.height = `${filesPanelPrefs.height}px`;
        };
        const onUp = () => {
          resizer.classList.remove("dragging");
          saveFilesPanelPrefs();
          window.removeEventListener("mousemove", onMove, true);
          window.removeEventListener("mouseup", onUp, true);
        };
        window.addEventListener("mousemove", onMove, true);
        window.addEventListener("mouseup", onUp, true);
      };
      panel.appendChild(resizer);

      const header = document.createElement("div");
      header.className = "agy-files-header";

      const headerLeft = document.createElement("div");
      headerLeft.className = "agy-files-header-left";
      headerLeft.title = "点击折叠/展开项目文件浏览框";
      headerLeft.onclick = () => toggleFilesPanelCollapse();

      const caretEl = document.createElement("span");
      caretEl.id = "agy-files-collapse-caret";
      caretEl.textContent = filesPanelPrefs.collapsed ? "▸" : "▾";

      const labelEl = document.createElement("span");
      labelEl.textContent = "Files";

      const projBadge = document.createElement("span");
      projBadge.id = "agy-files-proj-badge";
      projBadge.className = "agy-files-proj-badge";
      projBadge.textContent = currentFilesProject?.name || "未选择项目";

      headerLeft.appendChild(caretEl);
      headerLeft.appendChild(labelEl);
      headerLeft.appendChild(projBadge);

      const actions = document.createElement("div");
      actions.className = "agy-files-actions";

      const finderBtn = document.createElement("button");
      finderBtn.type = "button";
      finderBtn.className = "agy-files-icon-btn";
      finderBtn.title = "在 Finder 中打开当前项目文件夹";
      finderBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
      finderBtn.onclick = (e) => {
        e.stopPropagation();
        if (currentFilesProject?.folderPath) {
          triggerRevealInFinder(currentFilesProject.folderPath);
        }
      };

      const refreshBtn = document.createElement("button");
      refreshBtn.type = "button";
      refreshBtn.className = "agy-files-icon-btn";
      refreshBtn.title = "刷新文件列表";
      refreshBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>`;
      refreshBtn.onclick = (e) => {
        e.stopPropagation();
        refreshProjectFiles(true);
      };

      actions.appendChild(finderBtn);
      actions.appendChild(refreshBtn);

      header.appendChild(headerLeft);
      header.appendChild(actions);
      panel.appendChild(header);

      const tree = document.createElement("div");
      tree.id = "agy-files-tree";
      panel.appendChild(tree);

      if (p2.nextSibling) {
        p3.insertBefore(panel, p2.nextSibling);
      } else {
        p3.appendChild(panel);
      }
    }

    const badge = document.getElementById("agy-files-proj-badge");
    if (badge) {
      badge.textContent = currentFilesProject?.name || "未选择项目";
      badge.title = currentFilesProject?.folderPath || "";
    }
    return panel;
  }

  function toggleFilesPanelCollapse() {
    const panel = document.getElementById("agy-project-files-panel");
    if (!panel) return;
    filesPanelPrefs.collapsed = !filesPanelPrefs.collapsed;
    const caret = document.getElementById("agy-files-collapse-caret");
    if (filesPanelPrefs.collapsed) {
      panel.classList.add("collapsed");
      panel.style.height = "auto";
      if (caret) caret.textContent = "▸";
    } else {
      panel.classList.remove("collapsed");
      panel.style.height = `${filesPanelPrefs.height}px`;
      if (caret) caret.textContent = "▾";
      renderFilesTree(false);
    }
    saveFilesPanelPrefs();
  }

  async function renderFilesTree(forceFetchRoot = false) {
    const treeEl = document.getElementById("agy-files-tree");
    if (!treeEl || filesPanelPrefs.collapsed) return;

    if (!currentFilesProject || !currentFilesProject.folderPath) {
      treeEl.innerHTML = `<div class="agy-files-empty">暂无打开的项目目录</div>`;
      return;
    }

    const rootPath = currentFilesProject.folderPath;
    const rootEntries = await loadDirEntries(rootPath, forceFetchRoot);
    if (!rootEntries || rootEntries.length === 0) {
      treeEl.innerHTML = `<div class="agy-files-empty">文件夹为空或无法读取</div>`;
      return;
    }

    const fragment = document.createDocumentFragment();

    async function appendEntries(entries, depth) {
      for (const item of entries) {
        const isExpanded = item.isDir && expandedDirs.has(item.path);
        const row = document.createElement("div");
        row.className = "agy-file-row" + (selectedFilePath === item.path ? " selected" : "");
        row.style.paddingLeft = `${6 + depth * 14}px`;
        row.title = `${item.path}\n• 单击：选中${item.isDir ? "/展开" : ""}\n• 双击：用系统默认程序打开\n• 右键：在 Finder 中显示 / 更多操作`;

        const left = document.createElement("div");
        left.className = "agy-file-row-left";

        const caret = document.createElement("span");
        caret.className = "agy-file-caret";
        caret.textContent = item.isDir ? (isExpanded ? "▾" : "▸") : "";

        const icon = document.createElement("span");
        icon.className = "agy-file-icon";
        icon.textContent = getFileIcon(item.name, item.isDir, isExpanded);

        const nameSpan = document.createElement("span");
        nameSpan.className = "agy-file-name";
        nameSpan.textContent = item.name;

        left.appendChild(caret);
        left.appendChild(icon);
        left.appendChild(nameSpan);
        row.appendChild(left);

        if (recentlyOpenedPath === item.path) {
          const pill = document.createElement("span");
          pill.className = "agy-file-opened-pill";
          pill.textContent = "已打开";
          row.appendChild(pill);
        } else if (!item.isDir && item.size > 0) {
          const meta = document.createElement("span");
          meta.className = "agy-file-meta";
          meta.textContent = formatFileSize(item.size);
          row.appendChild(meta);
        }

        row.onclick = async (e) => {
          e.stopPropagation();
          selectedFilePath = item.path;
          if (item.isDir) {
            if (expandedDirs.has(item.path)) {
              expandedDirs.delete(item.path);
            } else {
              expandedDirs.add(item.path);
              await loadDirEntries(item.path, false);
            }
          }
          renderFilesTree(false);
        };

        row.ondblclick = (e) => {
          e.stopPropagation();
          e.preventDefault();
          selectedFilePath = item.path;
          if (!item.isDir) {
            triggerOpenWithDefaultApp(item.path);
          }
        };

        row.oncontextmenu = (e) => {
          e.preventDefault();
          e.stopPropagation();
          selectedFilePath = item.path;
          renderFilesTree(false);
          openFileContextMenu(item, e.clientX, e.clientY);
        };

        fragment.appendChild(row);

        if (isExpanded) {
          const subEntries = await loadDirEntries(item.path, false);
          await appendEntries(subEntries, depth + 1);
        }
      }
    }

    await appendEntries(rootEntries, 0);
    treeEl.innerHTML = "";
    treeEl.appendChild(fragment);
  }

  async function triggerRevealInFinder(targetPath) {
    try {
      await callBridge("revealInFinder", { targetPath });
    } catch (e) {
      const found = findReactProviders();
      if (found?.enf?.revealInFilePicker) {
        found.enf.revealInFilePicker(`file://${encodeURI(targetPath)}`);
      }
    }
  }

  async function triggerOpenWithDefaultApp(targetPath) {
    try {
      await callBridge("openDefault", { targetPath });
      recentlyOpenedPath = targetPath;
      renderFilesTree(false);
      setTimeout(() => {
        if (recentlyOpenedPath === targetPath) {
          recentlyOpenedPath = null;
          renderFilesTree(false);
        }
      }, 1500);
    } catch (e) {}
  }

  function closeFileContextMenu() {
    const existing = document.getElementById("agy-file-ctx-menu");
    if (existing) existing.remove();
  }

  function closePiModelPopover() {
    const existing = document.getElementById("agy-pi-model-popover");
    if (existing) existing.remove();
  }

  function openFileContextMenu(item, clientX, clientY) {
    closeFileContextMenu();
    closeTagPopover();
    closePiModelPopover();

    const menu = document.createElement("div");
    menu.id = "agy-file-ctx-menu";
    document.body.appendChild(menu);

    const actions = [
      {
        icon: "📂",
        label: "在 Finder 中显示",
        onClick: () => triggerRevealInFinder(item.path)
      },
      {
        icon: "🚀",
        label: "用系统默认程序打开",
        onClick: () => triggerOpenWithDefaultApp(item.path)
      },
      { sep: true },
      {
        icon: "📋",
        label: "复制完整路径",
        onClick: () => navigator.clipboard?.writeText(item.path)
      },
      {
        icon: "📄",
        label: "复制相对路径",
        onClick: () => {
          const root = currentFilesProject?.folderPath || "";
          const rel = item.path.startsWith(root + "/")
            ? item.path.slice(root.length + 1)
            : item.name;
          navigator.clipboard?.writeText(rel);
        }
      }
    ];

    actions.forEach(act => {
      if (act.sep) {
        const sep = document.createElement("div");
        sep.className = "agy-ctx-sep";
        menu.appendChild(sep);
        return;
      }
      const el = document.createElement("div");
      el.className = "agy-ctx-item";
      el.innerHTML = `<span>${act.icon}</span><span>${escapeHtml(act.label)}</span>`;
      el.onclick = (e) => {
        e.stopPropagation();
        closeFileContextMenu();
        act.onClick();
      };
      menu.appendChild(el);
    });

    const rect = menu.getBoundingClientRect();
    const top = Math.min(window.innerHeight - rect.height - 8, Math.max(8, clientY));
    const left = Math.min(window.innerWidth - rect.width - 8, Math.max(8, clientX));
    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
  }

  // --- AGY / Pi Dual-Engine Bar & Execution ---
  async function loadPiModelsIfNeeded() {
    if (piModelsCatalog.length > 0) return piModelsCatalog;
    try {
      const res = await callBridge("getPiModels");
      if (res && Array.isArray(res.models)) {
        piModelsCatalog = res.models;
        if (!piEngineState.model && res.defaultFullId) {
          piEngineState.model = res.defaultFullId;
          savePiEngineState();
        }
      }
    } catch (e) {}
    return piModelsCatalog;
  }

  function renderPiEngineBar() {
    const nativeModelBtn = document.querySelector('[data-testid="model-selector-trigger"]');
    if (!nativeModelBtn) return;

    const btnWrapper = nativeModelBtn.parentElement; // div.min-w-0
    const rowContainer = btnWrapper?.parentElement; // div.min-w-0.no-focus-agent-input
    if (!rowContainer) return;

    rowContainer.style.display = "inline-flex";
    rowContainer.style.alignItems = "center";
    rowContainer.style.gap = "4px";

    let bar = document.getElementById("agy-pi-engine-bar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "agy-pi-engine-bar";
      rowContainer.insertBefore(bar, btnWrapper);
    }

    const isPi = piEngineState.engine === "pi";
    nativeModelBtn.style.display = isPi ? "none" : "";

    // Highlight input card ring when in Pi mode
    let footer = rowContainer;
    while (footer && !footer.className?.includes?.("input-footer")) {
      footer = footer.parentElement;
    }
    const inputCard = footer?.parentElement;
    if (inputCard) {
      if (isPi) inputCard.classList.add("agy-pi-mode-ring");
      else inputCard.classList.remove("agy-pi-mode-ring");
    }

    const sig = `${piEngineState.engine}|${piEngineState.model}`;
    if (bar.getAttribute("data-sig") === sig) return;
    bar.setAttribute("data-sig", sig);
    bar.innerHTML = "";

    // 1. Segmented Engine Switcher (AGY vs Pi)
    const sw = document.createElement("div");
    sw.className = "agy-engine-switch";

    const agyOpt = document.createElement("button");
    agyOpt.type = "button";
    agyOpt.className = "agy-engine-opt" + (!isPi ? " active-agy" : "");
    agyOpt.title = "使用本机 Antigravity (AGY) 引擎";
    agyOpt.innerHTML = `<span>⚡ AGY</span>`;
    agyOpt.onclick = (e) => {
      e.stopPropagation();
      piEngineState.engine = "agy";
      savePiEngineState();
      renderPiEngineBar();
    };

    const piOpt = document.createElement("button");
    piOpt.type = "button";
    piOpt.className = "agy-engine-opt" + (isPi ? " active-pi" : "");
    piOpt.title = "切换到本机 Pi 引擎（可选全部第三方模型，共享当前项目与上下文）";
    piOpt.innerHTML = `<span>🥧 Pi</span>`;
    piOpt.onclick = async (e) => {
      e.stopPropagation();
      piEngineState.engine = "pi";
      savePiEngineState();
      await loadPiModelsIfNeeded();
      renderPiEngineBar();
    };

    sw.appendChild(agyOpt);
    sw.appendChild(piOpt);
    bar.appendChild(sw);

    // 2. When Pi engine is active, show Pi internal model selector + Send button
    if (isPi) {
      const modelTrig = document.createElement("button");
      modelTrig.type = "button";
      modelTrig.id = "agy-pi-model-trigger";
      modelTrig.title = "点击选择 Pi 内部模型 (~/.pi/agent/models.json)";
      const shortModel = piEngineState.model || "surplus/claude-haiku-5.5";
      modelTrig.innerHTML = `<span>${escapeHtml(shortModel)}</span><span style="opacity:0.65">▾</span>`;
      modelTrig.onclick = async (e) => {
        e.stopPropagation();
        await loadPiModelsIfNeeded();
        openPiModelPopover(modelTrig);
      };
      bar.appendChild(modelTrig);

      const sendBtn = document.createElement("button");
      sendBtn.type = "button";
      sendBtn.id = "agy-pi-send-btn";
      sendBtn.title = "发送当前输入框内容给 Pi 执行 (快捷键: Enter)";
      sendBtn.innerHTML = `<span>发送给 Pi ↵</span>`;
      sendBtn.onclick = (e) => {
        e.stopPropagation();
        submitPromptToPi();
      };
      bar.appendChild(sendBtn);
    }
  }

  function openPiModelPopover(anchorEl) {
    closePiModelPopover();
    closeTagPopover();
    closeFileContextMenu();

    const pop = document.createElement("div");
    pop.id = "agy-pi-model-popover";
    document.body.appendChild(pop);

    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.className = "agy-pop-input";
    searchInput.placeholder = "搜索 Pi 模型 (如 haiku, sonnet, deepseek, grok)...";
    pop.appendChild(searchInput);

    const listBox = document.createElement("div");
    listBox.className = "agy-pop-list";
    listBox.style.maxHeight = "260px";
    listBox.style.marginBottom = "0";
    pop.appendChild(listBox);

    function renderModelList(filterText = "") {
      listBox.innerHTML = "";
      const q = filterText.trim().toLowerCase();
      const filtered = piModelsCatalog.filter(m =>
        !q || m.fullId.toLowerCase().includes(q) || (m.name && m.name.toLowerCase().includes(q))
      );

      if (filtered.length === 0) {
        listBox.innerHTML = `<div class="agy-files-empty">未找到匹配的模型</div>`;
        return;
      }

      const byProvider = new Map();
      for (const m of filtered) {
        if (!byProvider.has(m.provider)) byProvider.set(m.provider, []);
        byProvider.get(m.provider).push(m);
      }

      for (const [prov, mods] of byProvider.entries()) {
        const gTitle = document.createElement("div");
        gTitle.className = "agy-pi-model-group-title";
        gTitle.textContent = prov;
        listBox.appendChild(gTitle);

        for (const m of mods) {
          const item = document.createElement("div");
          const isSel = piEngineState.model === m.fullId;
          item.className = "agy-pi-model-item" + (isSel ? " selected" : "");
          item.innerHTML = `
            <span class="truncate">${escapeHtml(m.id)}</span>
            <span style="font-size:10px;opacity:0.55">${isSel ? "✓ 当前" : (m.reasoning ? "🧠" : "")}</span>
          `;
          item.onclick = (e) => {
            e.stopPropagation();
            piEngineState.model = m.fullId;
            savePiEngineState();
            closePiModelPopover();
            renderPiEngineBar();
          };
          listBox.appendChild(item);
        }
      }
    }

    searchInput.oninput = () => renderModelList(searchInput.value);
    renderModelList("");

    const rect = anchorEl.getBoundingClientRect();
    const popRect = pop.getBoundingClientRect();
    const top = Math.max(8, rect.top - popRect.height - 8);
    const left = Math.min(window.innerWidth - 292, Math.max(8, rect.left));
    pop.style.top = `${top}px`;
    pop.style.left = `${left}px`;
    setTimeout(() => searchInput.focus(), 20);
  }

  function readAndClearChatInput() {
    const edEl = document.querySelector('[data-lexical-editor="true"]');
    if (!edEl) return "";
    const text = (edEl.__lexicalTextContent ?? edEl.innerText ?? "").trim();
    if (!text) return "";

    try {
      edEl.focus();
      document.execCommand("selectAll", false, null);
      document.execCommand("delete", false, null);
    } catch (e) {}
    return text;
  }

  // --- Pi Turns Rendering in Conversation Stream ---
  const activePiTurnsByConv = new Map(); // convId -> Array<TurnObj>
  let loadedConvIdForPi = null;

  function findConversationStreamContainer() {
    const trigger = document.querySelector('[data-testid="model-selector-trigger"]');
    let cur = trigger;
    for (let i = 0; i < 14 && cur; i++) {
      cur = cur.parentElement;
    }
    const msgWrapper = cur?.previousElementSibling;
    if (!msgWrapper) return null;
    const scrollArea = msgWrapper.querySelector(".overflow-y-auto");
    if (!scrollArea) return null;
    let container = document.getElementById("agy-pi-turns-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "agy-pi-turns-container";
      scrollArea.appendChild(container);
    } else if (container.parentElement !== scrollArea) {
      scrollArea.appendChild(container);
    }
    return { scrollArea, container };
  }

  async function ensurePiTurnsLoadedForCurrentConv() {
    const convId = getCurrentConversationId() || "global";
    if (loadedConvIdForPi === convId && activePiTurnsByConv.has(convId)) {
      renderPiTurnsInDom();
      return;
    }
    loadedConvIdForPi = convId;
    try {
      const saved = await callBridge("getPiTurns", { conversationId: convId });
      activePiTurnsByConv.set(convId, Array.isArray(saved) ? saved : []);
      renderPiTurnsInDom();
    } catch (e) {}
  }

  function renderPiTurnsInDom(autoScroll = false) {
    const found = findConversationStreamContainer();
    if (!found) return;
    const { scrollArea, container } = found;
    const convId = getCurrentConversationId() || "global";
    const turns = activePiTurnsByConv.get(convId) || [];

    if (turns.length === 0) {
      container.style.display = "none";
      container.innerHTML = "";
      return;
    }

    container.style.display = "flex";
    container.innerHTML = "";

    for (const t of turns) {
      const card = document.createElement("div");
      card.className = "agy-pi-turn-card";

      // User prompt bubble
      const userBubble = document.createElement("div");
      userBubble.className = "agy-pi-user-bubble";
      userBubble.textContent = t.prompt;
      card.appendChild(userBubble);

      // Assistant header
      const header = document.createElement("div");
      header.className = "agy-pi-assistant-header";

      const leftInfo = document.createElement("div");
      leftInfo.style.display = "flex";
      leftInfo.style.alignItems = "center";
      leftInfo.style.gap = "8px";
      leftInfo.innerHTML = `
        <span class="agy-pi-badge">🥧 Pi · ${escapeHtml(t.model || "claude-haiku-5.5")}</span>
        <span class="agy-pi-ctx-pill">📁 ${escapeHtml((t.projectPath || "").split("/").filter(Boolean).pop() || "项目目录")} · 🔗 共享 AGY 上下文</span>
      `;
      header.appendChild(leftInfo);

      if (t.running && t.runId) {
        const stopBtn = document.createElement("button");
        stopBtn.type = "button";
        stopBtn.className = "agy-pi-stop-btn";
        stopBtn.textContent = "⏹ 停止";
        stopBtn.onclick = () => {
          callBridge("stopPiRun", { runId: t.runId });
        };
        header.appendChild(stopBtn);
      }

      card.appendChild(header);

      // Tool calls list
      if (Array.isArray(t.tools) && t.tools.length > 0) {
        const toolsBox = document.createElement("div");
        toolsBox.className = "agy-pi-tools-list";
        for (const tl of t.tools) {
          const pill = document.createElement("span");
          pill.className = "agy-pi-tool-pill";
          const icon = tl.name === "bash" ? "⚡" : tl.name === "read" ? "📖" : tl.name === "edit" ? "✏️" : "📝";
          pill.textContent = `${icon} ${tl.name}: ${tl.summary || ""}`;
          toolsBox.appendChild(pill);
        }
        card.appendChild(toolsBox);
      }

      // Response body
      const body = document.createElement("div");
      body.className = "agy-pi-response-body";
      body.textContent = t.response || (t.running ? "⏳ Pi 正在思考并处理项目文件..." : "");
      card.appendChild(body);

      container.appendChild(card);
    }

    if (autoScroll) {
      scrollArea.scrollTop = scrollArea.scrollHeight;
    }
  }

  const unsyncedPiByConv = new Set(); // convIds that have new Pi turns not yet sent to AGY

  window.__agyPiStreamEvent = function(evt) {
    if (!evt || !evt.turnId) return;
    const convId = evt.conversationId || getCurrentConversationId() || "global";
    const list = activePiTurnsByConv.get(convId) || [];
    const turn = list.find(t => t.turnId === evt.turnId);
    if (!turn) return;

    if (evt.type === "text_delta") {
      turn.response = evt.fullResponse || (turn.response || "") + (evt.delta || "");
      renderPiTurnsInDom(true);
    } else if (evt.type === "tool_start") {
      if (!Array.isArray(turn.tools)) turn.tools = [];
      turn.tools.push({ name: evt.toolName, summary: evt.summary });
      renderPiTurnsInDom(true);
    } else if (evt.type === "done") {
      turn.running = false;
      if (evt.fullResponse) turn.response = evt.fullResponse;
      unsyncedPiByConv.add(convId);
      renderPiTurnsInDom(true);
      refreshProjectFiles(true);
    } else if (evt.type === "error") {
      turn.running = false;
      turn.response = (turn.response ? turn.response + "\n\n" : "") + `❌ 错误: ${evt.error}`;
      renderPiTurnsInDom(true);
    }
  };

  async function submitPromptToPi() {
    const prompt = readAndClearChatInput();
    if (!prompt) return;

    const convId = getCurrentConversationId() || "global";
    const activeProj = detectCurrentActiveProject();
    const projectPath = activeProj?.folderPath || "";
    const model = piEngineState.model || "surplus/claude-haiku-5.5";
    const turnId = `pi_turn_${Date.now()}`;
    const runId = `pi_run_${Date.now()}`;

    const list = activePiTurnsByConv.get(convId) || [];
    const newTurn = {
      turnId,
      runId,
      conversationId: convId,
      projectPath,
      model,
      prompt,
      response: "",
      tools: [],
      running: true,
      timestamp: Date.now()
    };
    list.push(newTurn);
    activePiTurnsByConv.set(convId, list);
    renderPiTurnsInDom(true);

    try {
      await callBridge("runPiPrompt", {
        runId,
        turnId,
        conversationId: convId,
        projectPath,
        model,
        prompt
      });
    } catch (e) {
      newTurn.running = false;
      newTurn.response = `❌ 启动 Pi 失败: ${e.message}`;
      renderPiTurnsInDom(true);
    }
  }

  // Intercept Enter key in chat input:
  // - In Pi mode: intercept and send to Pi engine
  // - In AGY mode: if Pi ran turns since last AGY message, append shared context note automatically
  const onKeyDownCapture = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const edEl = e.target?.closest?.('[data-lexical-editor="true"]');
      if (!edEl) return;

      if (piEngineState.engine === "pi") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        submitPromptToPi();
        return;
      }

      // AGY mode: check if there are unsynced Pi turns in this conversation
      const convId = getCurrentConversationId();
      if (convId && unsyncedPiByConv.has(convId)) {
        unsyncedPiByConv.delete(convId);
        const turns = activePiTurnsByConv.get(convId) || [];
        const lastTurn = turns[turns.length - 1];
        if (lastTurn && lastTurn.response) {
          const brief = lastTurn.response.replace(/\s+/g, " ").slice(0, 260);
          const ctxNote = `\n\n[系统上下文同步：刚才用户切换到 Pi (${lastTurn.model}) 执行了「${lastTurn.prompt.slice(0, 80)}」，完整记录见 ~/.gemini/antigravity/brain/${convId}/pi_shared_context.md，Pi 回复摘要：${brief}]`;
          try {
            edEl.focus();
            document.execCommand("insertText", false, ctxNote);
          } catch (err) {}
        }
      }
    }
  };
  window.addEventListener("keydown", onKeyDownCapture, true);

  // --- Tag Bar & Project Badges ---
  function hexToRgba(hex, alpha) {
    const clean = (hex || "#2563eb").replace("#", "");
    const r = parseInt(clean.substring(0, 2), 16) || 37;
    const g = parseInt(clean.substring(2, 4), 16) || 99;
    const b = parseInt(clean.substring(4, 6), 16) || 235;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function renderTagBar() {
    const listEl = document.querySelector('[data-testid="conversation-list-sidebar"]');
    if (!listEl) return;
    const wrapper = listEl.parentElement?.parentElement;
    if (!wrapper) return;

    if (wrapper.classList.contains("gap-6")) {
      wrapper.classList.remove("gap-6");
      wrapper.classList.add("gap-1");
    }

    let bar = document.getElementById("agy-project-tags-bar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "agy-project-tags-bar";
      wrapper.insertBefore(bar, wrapper.firstChild);
    } else if (bar.parentElement !== wrapper) {
      wrapper.insertBefore(bar, wrapper.firstChild);
    }

    const projects = getActiveProjectsList();
    const validTagIds = new Set(state.tags.map(t => t.id));
    const counts = { all: projects.length, __untagged__: 0 };
    state.tags.forEach(t => { counts[t.id] = 0; });

    for (const p of projects) {
      const pTags = (state.projectTags[p.id] || []).filter(id => validTagIds.has(id));
      if (pTags.length === 0) {
        counts.__untagged__++;
      } else {
        pTags.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
      }
    }

    if (state.activeTag !== "all" && state.activeTag !== "__untagged__" && !validTagIds.has(state.activeTag)) {
      state.activeTag = "all";
    }

    bar.innerHTML = "";

    const allBtn = document.createElement("button");
    allBtn.type = "button";
    allBtn.className = "agy-tag-pill" + (state.activeTag === "all" ? " active" : "");
    allBtn.style.setProperty("--agy-pill-color", "#2563eb");
    allBtn.style.setProperty("--agy-pill-bg", hexToRgba("#2563eb", 0.14));
    allBtn.innerHTML = `<span>全部</span><span class="agy-tag-count">${counts.all}</span>`;
    allBtn.onclick = () => selectTagFilter("all");
    bar.appendChild(allBtn);

    for (const tag of state.tags) {
      const btn = document.createElement("button");
      btn.type = "button";
      const isActive = state.activeTag === tag.id;
      btn.className = "agy-tag-pill" + (isActive ? " active" : "");
      btn.style.setProperty("--agy-pill-color", tag.color);
      btn.style.setProperty("--agy-pill-bg", hexToRgba(tag.color, 0.15));
      btn.innerHTML = `
        <span class="agy-tag-dot" style="background:${tag.color}"></span>
        <span>${escapeHtml(tag.name)}</span>
        <span class="agy-tag-count">${counts[tag.id] || 0}</span>
      `;
      btn.onclick = () => selectTagFilter(state.activeTag === tag.id ? "all" : tag.id);
      bar.appendChild(btn);
    }

    if (counts.__untagged__ > 0 || state.activeTag === "__untagged__") {
      const untaggedBtn = document.createElement("button");
      untaggedBtn.type = "button";
      const isActive = state.activeTag === "__untagged__";
      untaggedBtn.className = "agy-tag-pill" + (isActive ? " active" : "");
      untaggedBtn.style.setProperty("--agy-pill-color", "#6b7280");
      untaggedBtn.style.setProperty("--agy-pill-bg", hexToRgba("#6b7280", 0.15));
      untaggedBtn.innerHTML = `<span>未分类</span><span class="agy-tag-count">${counts.__untagged__}</span>`;
      untaggedBtn.onclick = () => selectTagFilter(state.activeTag === "__untagged__" ? "all" : "__untagged__");
      bar.appendChild(untaggedBtn);
    }

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "agy-tag-pill";
    addBtn.title = "新建或管理标签";
    addBtn.innerHTML = `<span>+ 标签</span>`;
    addBtn.onclick = (e) => {
      e.stopPropagation();
      openTagPopover(null, null, addBtn);
    };
    bar.appendChild(addBtn);
  }

  function selectTagFilter(tagId) {
    state.activeTag = tagId;
    saveState();
    const found = findReactProviders();
    if (found) {
      applyTagFilterToRpp(found.rpp);
    }
    renderTagBar();
    setTimeout(decorateProjectCards, 40);
  }

  function resolveProjectIdForCard(cardBtn) {
    const headerGroup = cardBtn.closest(".group\\/header");
    if (headerGroup) {
      const link = headerGroup.querySelector('a[href*="section="]');
      if (link) {
        try {
          const u = new URL(link.getAttribute("href"), window.location.origin);
          const sec = u.searchParams.get("section");
          if (sec) return sec;
        } catch (e) {}
      }
    }
    const label = cardBtn.getAttribute("data-project-label");
    if (label) {
      const projects = getActiveProjectsList();
      const matched = projects.find(p => p.name === label);
      if (matched) return matched.id;
    }
    return null;
  }

  function decorateProjectCards() {
    const cards = document.querySelectorAll("button[data-project-card]");
    const tagMap = new Map(state.tags.map(t => [t.id, t]));

    cards.forEach(cardBtn => {
      const projectId = resolveProjectIdForCard(cardBtn);
      if (!projectId) return;
      const projectName = cardBtn.getAttribute("data-project-label") || projectId;
      const assignedIds = (state.projectTags[projectId] || []).filter(id => tagMap.has(id));

      if (!cardBtn.__agyClickHooked) {
        cardBtn.__agyClickHooked = true;
        cardBtn.addEventListener("click", () => {
          manualSelectedProjectId = projectId;
          setTimeout(() => refreshProjectFiles(false), 60);
        });
      }

      const titleRow = cardBtn.querySelector(".truncate.text-sm")?.parentElement;
      if (titleRow) {
        let badgesContainer = titleRow.querySelector(".agy-proj-badges");
        if (!badgesContainer) {
          badgesContainer = document.createElement("span");
          badgesContainer.className = "agy-proj-badges";
          titleRow.appendChild(badgesContainer);
        }
        const sig = assignedIds.map(id => `${id}:${tagMap.get(id)?.name}:${tagMap.get(id)?.color}`).join("|");
        if (badgesContainer.getAttribute("data-sig") !== sig) {
          badgesContainer.setAttribute("data-sig", sig);
          badgesContainer.innerHTML = "";
          assignedIds.forEach(id => {
            const t = tagMap.get(id);
            if (!t) return;
            const b = document.createElement("span");
            b.className = "agy-proj-badge";
            b.style.background = hexToRgba(t.color, 0.14);
            b.style.color = t.color;
            b.style.borderColor = hexToRgba(t.color, 0.32);
            b.title = `点击修改「${projectName}」的标签`;
            b.textContent = t.name;
            b.onclick = (e) => {
              e.stopPropagation();
              e.preventDefault();
              openTagPopover(projectId, projectName, b);
            };
            badgesContainer.appendChild(b);
          });
        }
      }

      const headerGroup = cardBtn.closest(".group\\/header");
      if (headerGroup) {
        const actionContainer = headerGroup.querySelector(".absolute.right-1");
        if (actionContainer && !actionContainer.querySelector(".agy-proj-tag-btn")) {
          const tagBtn = document.createElement("button");
          tagBtn.type = "button";
          tagBtn.className = "agy-proj-tag-btn";
          tagBtn.title = "设置项目标签";
          tagBtn.setAttribute("data-no-drag", "");
          tagBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>`;
          tagBtn.onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();
            openTagPopover(projectId, projectName, tagBtn);
          };
          actionContainer.insertBefore(tagBtn, actionContainer.firstChild);
        }
      }
    });
  }

  let selectedNewTagColor = PRESET_COLORS[0];

  function closeTagPopover() {
    const existing = document.getElementById("agy-tag-popover");
    if (existing) existing.remove();
  }

  function openTagPopover(projectId, projectName, anchorEl) {
    closeTagPopover();
    closeFileContextMenu();
    closePiModelPopover();
    const pop = document.createElement("div");
    pop.id = "agy-tag-popover";
    document.body.appendChild(pop);

    const rect = anchorEl.getBoundingClientRect();
    const top = Math.min(window.innerHeight - 280, Math.max(8, rect.bottom + 6));
    const left = Math.min(window.innerWidth - 248, Math.max(8, rect.left));
    pop.style.top = `${top}px`;
    pop.style.left = `${left}px`;

    function renderPopoverContent() {
      const assigned = projectId ? new Set(state.projectTags[projectId] || []) : null;
      pop.innerHTML = "";

      const title = document.createElement("div");
      title.className = "agy-pop-title";
      title.innerHTML = `
        <span class="truncate">${projectId ? `项目标签：${escapeHtml(projectName)}` : "管理全部标签"}</span>
      `;
      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "agy-pop-del";
      closeBtn.style.opacity = "0.6";
      closeBtn.textContent = "✕";
      closeBtn.onclick = closeTagPopover;
      title.appendChild(closeBtn);
      pop.appendChild(title);

      const list = document.createElement("div");
      list.className = "agy-pop-list";

      state.tags.forEach(tag => {
        const row = document.createElement("div");
        row.className = "agy-pop-item";
        const isChecked = assigned ? assigned.has(tag.id) : false;

        const leftPart = document.createElement("div");
        leftPart.className = "agy-pop-item-left";
        leftPart.innerHTML = `
          ${projectId ? `<span class="agy-pop-check ${isChecked ? "checked" : ""}">${isChecked ? "✓" : ""}</span>` : ""}
          <span class="agy-tag-dot" style="background:${tag.color};width:8px;height:8px"></span>
          <span class="truncate">${escapeHtml(tag.name)}</span>
        `;

        if (projectId) {
          row.onclick = () => {
            const cur = new Set(state.projectTags[projectId] || []);
            if (cur.has(tag.id)) cur.delete(tag.id);
            else cur.add(tag.id);
            state.projectTags[projectId] = Array.from(cur);
            saveState();
            const found = findReactProviders();
            if (found && state.activeTag !== "all") {
              applyTagFilterToRpp(found.rpp);
            }
            renderTagBar();
            decorateProjectCards();
            renderPopoverContent();
          };
        }

        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "agy-pop-del";
        delBtn.title = `删除标签「${tag.name}」`;
        delBtn.textContent = "删除";
        delBtn.onclick = (e) => {
          e.stopPropagation();
          state.tags = state.tags.filter(t => t.id !== tag.id);
          if (state.activeTag === tag.id) state.activeTag = "all";
          saveState();
          const found = findReactProviders();
          if (found) applyTagFilterToRpp(found.rpp);
          renderTagBar();
          decorateProjectCards();
          renderPopoverContent();
        };

        row.appendChild(leftPart);
        row.appendChild(delBtn);
        list.appendChild(row);
      });

      pop.appendChild(list);

      const createBox = document.createElement("div");
      createBox.className = "agy-pop-create";

      const inputRow = document.createElement("div");
      inputRow.className = "agy-pop-input-row";
      const input = document.createElement("input");
      input.type = "text";
      input.className = "agy-pop-input";
      input.placeholder = "新建标签名称...";

      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "agy-pop-add-btn";
      addBtn.textContent = "添加";

      function handleCreateTag() {
        const name = input.value.trim();
        if (!name) return;
        const id = "tag_" + Date.now().toString(36);
        state.tags.push({ id, name, color: selectedNewTagColor });
        if (projectId) {
          const cur = new Set(state.projectTags[projectId] || []);
          cur.add(id);
          state.projectTags[projectId] = Array.from(cur);
        }
        selectedNewTagColor = PRESET_COLORS[(PRESET_COLORS.indexOf(selectedNewTagColor) + 1) % PRESET_COLORS.length];
        saveState();
        renderTagBar();
        decorateProjectCards();
        renderPopoverContent();
      }

      addBtn.onclick = handleCreateTag;
      input.onkeydown = (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          handleCreateTag();
        }
      };

      inputRow.appendChild(input);
      inputRow.appendChild(addBtn);
      createBox.appendChild(inputRow);

      const colorsRow = document.createElement("div");
      colorsRow.className = "agy-pop-colors";
      PRESET_COLORS.forEach(c => {
        const sw = document.createElement("span");
        sw.className = "agy-color-swatch" + (c === selectedNewTagColor ? " selected" : "");
        sw.style.background = c;
        sw.onclick = (e) => {
          e.stopPropagation();
          selectedNewTagColor = c;
          renderPopoverContent();
        };
        colorsRow.appendChild(sw);
      });
      createBox.appendChild(colorsRow);
      pop.appendChild(createBox);
    }

    renderPopoverContent();
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const onMouseDown = (e) => {
    const pop = document.getElementById("agy-tag-popover");
    if (pop && !pop.contains(e.target) && !e.target.closest(".agy-proj-badge") && !e.target.closest(".agy-proj-tag-btn")) {
      closeTagPopover();
    }
    const ctx = document.getElementById("agy-file-ctx-menu");
    if (ctx && !ctx.contains(e.target)) {
      closeFileContextMenu();
    }
    const piPop = document.getElementById("agy-pi-model-popover");
    if (piPop && !piPop.contains(e.target) && !e.target.closest("#agy-pi-model-trigger")) {
      closePiModelPopover();
    }
  };
  document.addEventListener("mousedown", onMouseDown, true);

  let lastHref = window.location.href;

  function checkUrlChange() {
    if (window.location.href !== lastHref) {
      lastHref = window.location.href;
      refreshProjectFiles(false);
      ensurePiTurnsLoadedForCurrentConv();
    }
  }

  const origPushState = history.pushState;
  const origReplaceState = history.replaceState;
  history.pushState = function(...args) {
    const res = origPushState.apply(this, args);
    setTimeout(checkUrlChange, 20);
    return res;
  };
  history.replaceState = function(...args) {
    const res = origReplaceState.apply(this, args);
    setTimeout(checkUrlChange, 20);
    return res;
  };
  window.addEventListener("popstate", checkUrlChange);

  function refreshAll() {
    ensureStyles();
    const found = findReactProviders();
    if (found) {
      applyTagFilterToRpp(found.rpp);
    }
    renderTagBar();
    decorateProjectCards();
    refreshProjectFiles(false);
    renderPiEngineBar();
    ensurePiTurnsLoadedForCurrentConv();
  }

  let rafPending = false;
  const observer = new MutationObserver(() => {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      if (!document.getElementById("agy-project-tags-bar")) {
        renderTagBar();
      }
      if (!document.getElementById("agy-project-files-panel")) {
        refreshProjectFiles(false);
      } else {
        checkUrlChange();
      }
      if (!document.getElementById("agy-pi-engine-bar")) {
        renderPiEngineBar();
      }
      if (!document.getElementById("agy-pi-turns-container")) {
        renderPiTurnsInDom(false);
      }
      decorateProjectCards();
    });
  });

  function startObserver() {
    ensureStyles();
    loadPiModelsIfNeeded();
    refreshAll();
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function _cleanupForUpgrade() {
    observer.disconnect();
    history.pushState = origPushState;
    history.replaceState = origReplaceState;
    window.removeEventListener("popstate", checkUrlChange);
    window.removeEventListener("keydown", onKeyDownCapture, true);
    document.removeEventListener("mousedown", onMouseDown, true);
    closeTagPopover();
    closeFileContextMenu();
    closePiModelPopover();
  }

  function uninstall() {
    _cleanupForUpgrade();
    document.getElementById("agy-project-tags-bar")?.remove();
    document.getElementById("agy-project-files-panel")?.remove();
    document.getElementById("agy-pi-engine-bar")?.remove();
    document.getElementById("agy-pi-turns-container")?.remove();
    document.getElementById("agy-project-tags-style")?.remove();
    const nativeModelBtn = document.querySelector('[data-testid="model-selector-trigger"]');
    if (nativeModelBtn) nativeModelBtn.style.display = "";
    document.querySelectorAll(".agy-proj-badges, .agy-proj-tag-btn").forEach(el => el.remove());
    if (cachedRpp && cachedRpp._rawState && cachedRpp._origSetState) {
      cachedRpp._origSetState(cachedRpp._rawState);
    }
    delete window.__AGY_TAG_NAV_INSTANCE__;
  }

  window.__AGY_TAG_NAV_INSTANCE__ = {
    version: INSTANCE_VERSION,
    refreshAll,
    refreshProjectFiles,
    uninstall,
    _cleanupForUpgrade,
    setConfig(newCfg) {
      state = newCfg;
      saveState();
      refreshAll();
    },
    getState: () => state
  };

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", startObserver);
  } else {
    startObserver();
  }
  return "injected_v4_ok";
})();

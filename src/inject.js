(() => {
  const INSTANCE_VERSION = 11;
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

  // Clean monochrome & brand SVG icons matching Antigravity and Pi official vectors
  const SVG_ICONS = {
    agyLogo: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="88 94 340 316" class="shrink-0" aria-hidden="true"><defs><linearGradient id="agy-brand-grad" x1="258" y1="106" x2="258" y2="396" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#F8623A"/><stop offset="22%" stop-color="#E59B38"/><stop offset="44%" stop-color="#58A68C"/><stop offset="68%" stop-color="#3487FD"/><stop offset="100%" stop-color="#589FFA"/></linearGradient><radialGradient id="agy-brand-green" cx="195" cy="175" r="110" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#76C84D" stop-opacity="0.9"/><stop offset="100%" stop-color="#76C84D" stop-opacity="0"/></radialGradient><radialGradient id="agy-brand-red" cx="305" cy="165" r="115" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#F45242" stop-opacity="0.88"/><stop offset="100%" stop-color="#F45242" stop-opacity="0"/></radialGradient></defs><path fill="url(#agy-brand-grad)" d="M258 110C214 110 192 175 167 260C148 325 132 355 108 377C101 384 105 394 116 394C138 394 166 360 198 308C218 276 236 263 258 263C280 263 298 276 318 308C350 360 378 394 400 394C411 394 415 384 408 377C384 355 368 325 349 260C324 175 302 110 258 110Z"/><path fill="url(#agy-brand-green)" d="M258 110C214 110 192 175 167 260C148 325 132 355 108 377C101 384 105 394 116 394C138 394 166 360 198 308C218 276 236 263 258 263C280 263 298 276 318 308C350 360 378 394 400 394C411 394 415 384 408 377C384 355 368 325 349 260C324 175 302 110 258 110Z"/><path fill="url(#agy-brand-red)" d="M258 110C214 110 192 175 167 260C148 325 132 355 108 377C101 384 105 394 116 394C138 394 166 360 198 308C218 276 236 263 258 263C280 263 298 276 318 308C350 360 378 394 400 394C411 394 415 384 408 377C384 355 368 325 349 260C324 175 302 110 258 110Z"/></svg>`,
    piLogo: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="150 150 500 500" class="shrink-0" aria-hidden="true"><path fill="#F09082" d="M165.29 165.29H517.36V400H400V282.65H165.29Z"/><path fill="#4D9ABF" d="M165.29 282.65H282.65V400H400V517.36H282.65V634.72H165.29Z"/><path fill="#F1BE58" d="M517.36 400H634.72V634.72H517.36Z"/></svg>`,
    statusSpinner: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 -960 960 960" fill="currentColor" class="animate-spin shrink-0 opacity-70" data-testid="status-loading-spinner"><path d="M332.55-129.9q-69.29-29.9-121.02-81.63T129.9-332.55T100-480.35t29.96-147.5t81.58-120.61t121.04-81.58T480-860q12.75,0 21.37,8.63T510-829.99t-8.62,21.37T480-800q-133,0-226.5,93.5T160-480t93.5,226.5T480-160t226.5-93.5T800-480q0-12.77 8.63-21.38T830.01-510t21.37,8.62T860-480q0,77.99-29.96,147.42T748.46-211.54T627.85-129.96T480.35-100t-147.8-29.9Z"></path></svg>`,
    chevronRight: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 -960 960 960" fill="currentColor" class="shrink-0 transition-transform duration-150"><path d="M517.85-480l-184-184L376-706.15L602.15-480L376-253.85L333.85-296l184-184Z"></path></svg>`,
    folderFallback: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 -960 960 960" fill="currentColor" class="shrink-0 text-muted-foreground"><path d="M170-180q-29.15,0-49.58-20.42T100-250V-707.69q0-29.15 21.58-50.73T172.31-780H391.92l80,80H787.69q26.85,0 46.31,17.35T856.54-640H447.38l-80-80H172.31q-5.39,0-8.85,3.46T160-707.69v455.38q0,4.23 2.12,6.92t5.58,4.62L261-552.31H927.31L830.46-229.69q-6.85,22.54-25.65,36.11T763.08-180H170Zm60.54-60H770.77l75.46-252.31H306L230.54-240Zm0,0L306-492.31L230.54-240ZM160-640v-67.69q0-5.39 0-8.85t0-3.46v80Z"></path></svg>`,
    fileFallback: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 text-muted-foreground"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`,
    finderOpen: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`,
    refresh: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>`,
    moreHorizontal: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>`,
    externalLink: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`,
    download: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
    copy: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
    tag: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>`
  };

  if (window.__AGY_TAG_NAV_INSTANCE__) {
    if (window.__AGY_TAG_NAV_INSTANCE__.version === INSTANCE_VERSION) {
      if (window.__AGY_INITIAL_PROJECT_TAGS__ && !localStorage.getItem(STORAGE_KEY)) {
        window.__AGY_TAG_NAV_INSTANCE__.setConfig(window.__AGY_INITIAL_PROJECT_TAGS__);
      }
      window.__AGY_TAG_NAV_INSTANCE__.refreshAll();
      return "already_active_refreshed_v11";
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

  // --- Dual-Transport Bridge (CDP on Desktop + HTTP/SSE on Web) ---
  let bridgeReqSeq = 1;
  const pendingBridgeCalls = new Map();
  let webEventSource = null;

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

  function isWebMode() {
    return Boolean(window.__AGY_IS_WEB__) || typeof window.__agyBridgeCall !== "function";
  }

  function callBridge(cmd, args = {}) {
    // 1. Desktop CDP mode
    if (typeof window.__agyBridgeCall === "function") {
      return new Promise((resolve, reject) => {
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

    // 2. Web HTTP mode (/__agy-plugin/api)
    return fetch("/__agy-plugin/api", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cmd, args })
    })
      .then(r => r.json())
      .then(resObj => {
        if (resObj && resObj.ok) return resObj.data;
        throw new Error(resObj?.error || "Web API call failed");
      });
  }

  function ensureWebEventSource() {
    if (!isWebMode() || webEventSource) return;
    try {
      webEventSource = new EventSource("/__agy-plugin/pi-stream", { withCredentials: true });
      webEventSource.onmessage = (e) => {
        try {
          const evt = JSON.parse(e.data);
          if (window.__agyPiStreamEvent) {
            window.__agyPiStreamEvent(evt);
          }
        } catch (err) {}
      };
      webEventSource.onerror = () => {
        // Browser EventSource automatically reconnects
      };
    } catch (e) {}
  }

  // --- Config State ---
  function loadInitialConfig() {
    if (window.__AGY_INITIAL_PROJECT_TAGS__) {
      return JSON.parse(JSON.stringify(window.__AGY_INITIAL_PROJECT_TAGS__));
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.tags) && parsed.projectTags) {
          return parsed;
        }
      }
    } catch (e) {}
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
          height: Math.min(520, Math.max(110, Number(p.height) || 210)),
          collapsed: Boolean(p.collapsed)
        };
      }
    } catch (e) {}
    return { height: 210, collapsed: false };
  }

  function loadPiEngineState() {
    try {
      const raw = localStorage.getItem(PI_ENGINE_STATE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        return {
          engine: p.engine === "pi" ? "pi" : "agy",
          model: p.model || "surplus/claude-haiku-5.5",
          byConv: p.byConv && typeof p.byConv === "object" ? p.byConv : {}
        };
      }
    } catch (e) {}
    return { engine: "agy", model: "surplus/claude-haiku-5.5", byConv: {} };
  }

  let state = loadInitialConfig();
  if (!state.activeTag) state.activeTag = "all";
  let filesPanelPrefs = loadFilesPanelState();
  let piEngineState = loadPiEngineState();
  let piModelsCatalog = [];

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

  function setConvEngineState(convId, engine, model) {
    piEngineState.engine = engine === "pi" ? "pi" : "agy";
    if (model) piEngineState.model = model;
    if (!piEngineState.byConv || typeof piEngineState.byConv !== "object") {
      piEngineState.byConv = {};
    }
    const key = convId || "global";
    piEngineState.byConv[key] = {
      engine: piEngineState.engine,
      model: piEngineState.model,
      updatedAt: Date.now()
    };
    savePiEngineState();
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
    if (typeof window.__agySaveProjectTags === "function") {
      try {
        window.__agySaveProjectTags(json);
      } catch (e) {}
    } else {
      callBridge("saveTags", { rawStr: json }).catch(() => {});
    }
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
        padding: 2px 8px 6px 8px;
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
        border: 1px solid rgba(128, 128, 128, 0.22);
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.16), 0 2px 6px rgba(0, 0, 0, 0.06);
        font-size: 12px;
        user-select: none;
      }
      #agy-tag-popover {
        width: 236px;
        padding: 10px;
      }
      #agy-file-ctx-menu {
        min-width: 196px;
        padding: 4px;
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

      /* --- Native-Look Project Files Section --- */
      #agy-project-files-panel {
        display: flex;
        flex-direction: column;
        flex-shrink: 0;
        width: 100%;
        user-select: none;
      }
      #agy-files-resizer {
        height: 7px;
        display: flex;
        align-items: center;
        cursor: ns-resize;
        width: 100%;
        flex-shrink: 0;
        padding: 0 8px;
      }
      #agy-files-resizer-line {
        height: 1px;
        width: 100%;
        background: rgba(128, 128, 128, 0.18);
        transition: background 0.12s ease, height 0.12s ease;
      }
      #agy-files-resizer:hover #agy-files-resizer-line,
      #agy-files-resizer.dragging #agy-files-resizer-line {
        height: 2px;
        background: rgba(37, 99, 235, 0.55);
      }
      #agy-files-tree {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 2px 8px 4px 8px;
      }
      #agy-project-files-panel.collapsed #agy-files-tree {
        display: none;
      }
      .agy-native-file-icon {
        width: 15px;
        height: 15px;
        flex-shrink: 0;
        object-fit: contain;
      }
      .agy-file-meta {
        font-size: 10.5px;
        opacity: 0.42;
        margin-left: 6px;
        flex-shrink: 0;
        font-variant-numeric: tabular-nums;
      }
      .agy-file-more-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border-radius: 4px;
        border: none;
        background: transparent;
        color: inherit;
        opacity: 0;
        cursor: pointer;
        padding: 0;
        flex-shrink: 0;
        transition: opacity 0.1s ease, background 0.1s ease;
      }
      .agy-file-row-btn:hover .agy-file-more-btn,
      .agy-file-row-btn.selected .agy-file-more-btn {
        opacity: 0.6;
      }
      @media (pointer: coarse) {
        .agy-file-more-btn {
          opacity: 0.55;
        }
      }
      .agy-file-more-btn:hover {
        opacity: 1 !important;
        background: rgba(128, 128, 128, 0.16);
      }
      .agy-file-opened-pill {
        font-size: 10px;
        padding: 1px 5px;
        border-radius: 4px;
        background: rgba(5, 150, 105, 0.15);
        color: #059669;
        font-weight: 500;
        margin-left: 4px;
        flex-shrink: 0;
      }
      .agy-files-empty {
        padding: 12px 10px;
        text-align: center;
        font-size: 12px;
        opacity: 0.45;
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
      .agy-ctx-item svg {
        opacity: 0.65;
        flex-shrink: 0;
      }
      .agy-ctx-item:hover {
        background: rgba(128, 128, 128, 0.12);
      }
      .agy-ctx-item:hover svg {
        opacity: 0.95;
      }
      .agy-ctx-sep {
        height: 1px;
        margin: 4px 4px;
        background: rgba(128, 128, 128, 0.15);
      }

      /* --- AGY / Pi Dual-Engine Selector & Chat UI --- */
      #agy-pi-engine-bar {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        margin-right: 4px;
        user-select: none;
      }
      .agy-engine-switch {
        display: inline-flex;
        align-items: center;
        height: 26px;
        padding: 2px;
        border-radius: 999px;
        background: rgba(128, 128, 128, 0.11);
        border: 1px solid rgba(128, 128, 128, 0.16);
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
        opacity: 0.72;
        transition: all 0.14s ease;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
      }
      .agy-engine-opt svg,
      .agy-pi-badge svg {
        display: block;
        flex-shrink: 0;
      }
      .agy-engine-opt:hover {
        opacity: 1;
      }
      .agy-engine-opt.active-agy {
        opacity: 1;
        font-weight: 600;
        background: rgba(128, 128, 128, 0.2);
        color: inherit;
      }
      .agy-engine-opt.active-pi {
        opacity: 1;
        font-weight: 600;
        background: #7c3aed;
        color: #ffffff;
      }
      #agy-pi-model-trigger {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        height: 26px;
        padding: 0 9px;
        border-radius: 999px;
        font-size: 11.5px;
        font-weight: 500;
        border: 1px solid rgba(124, 58, 237, 0.32);
        background: rgba(124, 58, 237, 0.08);
        color: #7c3aed;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.12s ease;
      }
      html[style*="dark"] #agy-pi-model-trigger {
        background: rgba(139, 92, 246, 0.18);
        color: #c4b5fd;
        border-color: rgba(139, 92, 246, 0.36);
      }
      #agy-pi-model-trigger:hover {
        background: rgba(124, 58, 237, 0.15);
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
        transition: opacity 0.12s ease, transform 0.1s ease, background 0.14s ease;
      }
      #agy-pi-send-btn:hover {
        opacity: 0.92;
      }
      #agy-pi-send-btn:active {
        transform: scale(0.96);
      }
      .agy-pi-mode-ring {
        box-shadow: 0 0 0 1.5px rgba(124, 58, 237, 0.4) !important;
      }
      .agy-pi-model-group-title {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        opacity: 0.5;
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
        background: rgba(128, 128, 128, 0.12);
      }
      .agy-pi-model-item.selected {
        background: rgba(124, 58, 237, 0.14);
        color: #7c3aed;
        font-weight: 600;
      }
      html[style*="dark"] .agy-pi-model-item.selected {
        color: #c4b5fd;
      }

      /* --- Pi Conversation Stream & Native Interleaved Turns --- */
      div[data-turn-content="latest"]:has(~ .agy-pi-native-turn),
      .flex.items-start:has(~ .agy-pi-native-turn) {
        min-height: 0 !important;
      }
      .agy-pi-native-turn {
        width: 100%;
      }
      .agy-pi-worked-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        width: 100%;
        padding: 4px 8px;
        min-height: 32px;
        border-radius: 8px;
        font-size: 13px;
        user-select: none;
      }
      .agy-pi-engine-inline-tag {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 12px;
        font-weight: 500;
        color: var(--muted-foreground, #6b7280);
      }
      .agy-pi-engine-inline-tag svg {
        display: block;
        flex-shrink: 0;
      }
      .agy-pi-md-pre {
        margin: 6px 0;
        padding: 10px 12px;
        border-radius: 8px;
        background: rgba(128, 128, 128, 0.09);
        border: 1px solid rgba(128, 128, 128, 0.16);
        overflow-x: auto;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 12.5px;
        line-height: 1.5;
      }
      .agy-pi-md-blockquote {
        margin: 4px 0;
        padding: 4px 12px;
        border-left: 3px solid rgba(128, 128, 128, 0.35);
        opacity: 0.9;
      }
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
        border: 1px solid rgba(128, 128, 128, 0.2);
        background: rgba(128, 128, 128, 0.03);
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
        background: rgba(124, 58, 237, 0.12);
        color: #7c3aed;
      }
      html[style*="dark"] .agy-pi-badge {
        background: rgba(139, 92, 246, 0.2);
        color: #c4b5fd;
      }
      .agy-pi-ctx-pill {
        font-size: 11px;
        opacity: 0.58;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .agy-pi-tools-list {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        padding: 2px 8px 4px 8px;
      }
      .agy-pi-tool-pill {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        padding: 2px 7px;
        border-radius: 5px;
        background: rgba(128, 128, 128, 0.09);
        border: 1px solid rgba(128, 128, 128, 0.15);
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
  let cachedFitp = null;
  let cachedReduxStore = null;
  let reduxStoreUnsubscribe = null;

  function findReactProviders() {
    const el = document.querySelector('[data-testid="conversation-list-sidebar"]');
    if (!el) return null;
    if (cachedRpp && cachedPmf && cachedReduxStore && cachedFitp) {
      return { pmf: cachedPmf, rpp: cachedRpp, ssp: cachedSsp, enf: cachedEnf, fitp: cachedFitp, store: cachedReduxStore };
    }
    const fiberKey = Object.keys(el).find(k => k.startsWith("__reactFiber$"));
    if (!fiberKey) return null;
    let cur = el[fiberKey];
    while (cur) {
      const v = cur.memoizedProps?.value;
      if (v && typeof v === "object") {
        if (v.projectManagementFeature?.richProjectsProvider) {
          cachedPmf = v.projectManagementFeature;
          cachedRpp = cachedPmf.richProjectsProvider;
        } else if (v.core?.projectManagementService?.richProjectsProvider) {
          cachedPmf = v.core.projectManagementService;
          cachedRpp = cachedPmf.richProjectsProvider;
        }
        if (v.sidebarSectionsProvider) {
          cachedSsp = v.sidebarSectionsProvider;
        }
        if (v.electronNativeFeature) {
          cachedEnf = v.electronNativeFeature;
        } else if (v.getCache instanceof Map && v.getCache.get("electronNativeFeature")) {
          cachedEnf = v.getCache.get("electronNativeFeature");
        }
        if (v.fileIconThemeProvider) {
          cachedFitp = v.fileIconThemeProvider;
        } else if (v.iconDefinitions && v.fileExtensions && v.folderNames) {
          cachedFitp = { provider: { state: v } };
        }
        if (v.store && typeof v.store.getState === "function" && typeof v.store.dispatch === "function") {
          cachedReduxStore = v.store;
        }
      }
      cur = cur.return;
    }
    if (!cachedRpp) return null;
    hookRichProjectsProvider(cachedPmf, cachedRpp);
    hookReduxStoreForPiMeta(cachedReduxStore);
    return { pmf: cachedPmf, rpp: cachedRpp, ssp: cachedSsp, enf: cachedEnf, fitp: cachedFitp, store: cachedReduxStore };
  }

  function resolveNativeIconUrl(name, isDir) {
    const found = findReactProviders();
    const st = found?.fitp?.provider?.state;
    if (!st || !st.iconDefinitions) return null;
    const lower = (name || "").toLowerCase();
    let key = null;
    if (isDir) {
      key = st.folderNames?.[lower] || st.folder || "folder";
    } else {
      const ext = lower.includes(".") ? lower.split(".").pop() : "";
      key =
        st.fileNames?.[name] ||
        st.fileNames?.[lower] ||
        st.fileExtensions?.[ext] ||
        st.languageIds?.[ext] ||
        st.file ||
        "document";
    }
    const rel = st.iconDefinitions[key]?.iconPath;
    if (!rel) return null;
    return rel.replace(/^\.\//, "/symbols-icons/");
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
        renderTagBar();
        setTimeout(decorateProjectCards, 40);
      };

      if (state.activeTag && state.activeTag !== "all") {
        applyTagFilterToRpp(rpp);
      }

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
    if (convId && found.store) {
      try {
        const st = found.store.getState();
        const pidFromMeta = st?.trajectorySummaries?.summaries?.[convId]?.trajectoryMetadata?.projectId;
        if (pidFromMeta) {
          const byMeta = getProjectById(pidFromMeta);
          if (byMeta) return byMeta;
        }
        const secs = st?.sidebarSections?.sidebarSections;
        if (Array.isArray(secs)) {
          for (const sec of secs) {
            if (Array.isArray(sec.conversations) && sec.conversations.some(c => c.conversationId === convId || c.cascadeId === convId)) {
              const bySecUri = getProjectById(sec.uri);
              if (bySecUri) return bySecUri;
            }
          }
        }
      } catch (e) {}
    }
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

  // --- Native-Look Project Files Section ---
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
      panel.className = "bg-sidebar";
      if (filesPanelPrefs.collapsed) {
        panel.classList.add("collapsed");
      } else {
        panel.style.height = `${filesPanelPrefs.height}px`;
      }

      // Top 1px section divider + drag resizer
      const resizer = document.createElement("div");
      resizer.id = "agy-files-resizer";
      resizer.title = "上下拖动调整 Files 区域高度";
      resizer.innerHTML = `<div id="agy-files-resizer-line"></div>`;
      resizer.onmousedown = (e) => {
        if (filesPanelPrefs.collapsed) return;
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

      // Native Antigravity Section Header (identical to `Projects` header)
      const headerWrap = document.createElement("div");
      headerWrap.className = "group/section-header flex items-center justify-between px-4 h-6 select-none bg-sidebar shrink-0";

      const h2 = document.createElement("h2");
      h2.className = "text-xs opacity-50 font-medium select-none m-0 min-w-0 flex-1 flex items-center";

      const titleBtn = document.createElement("button");
      titleBtn.type = "button";
      titleBtn.className = "flex min-w-0 items-center gap-1 border-none bg-transparent p-0 text-left cursor-pointer font-inherit text-inherit rounded focus-visible:outline-none";
      titleBtn.onclick = () => toggleFilesPanelCollapse();

      const titleText = document.createElement("span");
      titleText.className = "truncate";
      titleText.textContent = "Files";

      const projSub = document.createElement("span");
      projSub.id = "agy-files-proj-badge";
      projSub.className = "truncate opacity-75 font-normal";
      projSub.textContent = currentFilesProject?.name ? `· ${currentFilesProject.name}` : "";

      const caretWrap = document.createElement("span");
      caretWrap.id = "agy-files-collapse-caret";
      caretWrap.className = "inline-flex items-center justify-center transition-transform duration-150 " + (filesPanelPrefs.collapsed ? "" : "rotate-90");
      caretWrap.innerHTML = SVG_ICONS.chevronRight;

      titleBtn.appendChild(titleText);
      titleBtn.appendChild(projSub);
      titleBtn.appendChild(caretWrap);
      h2.appendChild(titleBtn);

      const actions = document.createElement("div");
      actions.className = "flex items-center justify-end gap-1 shrink-0";

      const btnClass = "inline-flex items-center font-medium transition-colors select-none outline-none cursor-pointer justify-center bg-transparent text-muted-foreground hover:text-foreground hover:bg-secondary h-5 w-5 shrink-0 rounded-md border-none p-0";

      const finderBtn = document.createElement("button");
      finderBtn.type = "button";
      finderBtn.className = btnClass;
      finderBtn.title = "在 Finder 中打开项目根目录";
      finderBtn.innerHTML = SVG_ICONS.finderOpen;
      finderBtn.onclick = (e) => {
        e.stopPropagation();
        if (currentFilesProject?.folderPath) {
          triggerRevealInFinder(currentFilesProject.folderPath);
        }
      };

      const refreshBtn = document.createElement("button");
      refreshBtn.type = "button";
      refreshBtn.className = btnClass;
      refreshBtn.title = "刷新文件列表";
      refreshBtn.innerHTML = SVG_ICONS.refresh;
      refreshBtn.onclick = (e) => {
        e.stopPropagation();
        refreshProjectFiles(true);
      };

      actions.appendChild(finderBtn);
      actions.appendChild(refreshBtn);

      headerWrap.appendChild(h2);
      headerWrap.appendChild(actions);
      panel.appendChild(headerWrap);

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
      badge.textContent = currentFilesProject?.name ? `· ${currentFilesProject.name}` : "";
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
      if (caret) caret.classList.remove("rotate-90");
    } else {
      panel.classList.remove("collapsed");
      panel.style.height = `${filesPanelPrefs.height}px`;
      if (caret) caret.classList.add("rotate-90");
      renderFilesTree(false);
    }
    saveFilesPanelPrefs();
  }

  function createFileIconElement(name, isDir) {
    const iconUrl = resolveNativeIconUrl(name, isDir);
    if (iconUrl) {
      const img = document.createElement("img");
      img.src = iconUrl;
      img.className = "agy-native-file-icon";
      img.alt = "";
      img.draggable = false;
      img.onerror = () => {
        const span = document.createElement("span");
        span.className = "inline-flex items-center justify-center w-4 h-4 shrink-0";
        span.innerHTML = isDir ? SVG_ICONS.folderFallback : SVG_ICONS.fileFallback;
        img.replaceWith(span);
      };
      return img;
    }
    const span = document.createElement("span");
    span.className = "inline-flex items-center justify-center w-4 h-4 shrink-0";
    span.innerHTML = isDir ? SVG_ICONS.folderFallback : SVG_ICONS.fileFallback;
    return span;
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
      treeEl.innerHTML = `<div class="agy-files-empty">文件夹为空</div>`;
      return;
    }

    const fragment = document.createDocumentFragment();

    async function appendEntries(entries, depth) {
      for (const item of entries) {
        const isExpanded = item.isDir && expandedDirs.has(item.path);
        const isSelected = selectedFilePath === item.path;

        // Native Antigravity sidebar row button classes
        const row = document.createElement("button");
        row.type = "button";
        row.className =
          "agy-file-row-btn group/headerbtn flex items-center justify-between pr-1.5 h-7 rounded-lg select-none cursor-pointer w-full border-none outline-none text-left transition-colors " +
          (isSelected
            ? "selected bg-muted text-secondary-foreground font-medium"
            : "text-muted-foreground hover:bg-muted hover:text-secondary-foreground bg-sidebar");
        row.style.paddingLeft = `${4 + depth * 14}px`;
        row.title = item.path;

        const left = document.createElement("div");
        left.className = "flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden";

        // Chevron for folders, spacer for files
        const caret = document.createElement("span");
        caret.className = "w-3.5 h-3.5 shrink-0 inline-flex items-center justify-center opacity-60";
        if (item.isDir) {
          caret.innerHTML = SVG_ICONS.chevronRight;
          if (isExpanded) {
            caret.firstElementChild?.classList.add("rotate-90");
          }
        }

        const iconEl = createFileIconElement(item.name, item.isDir);

        const nameSpan = document.createElement("span");
        nameSpan.className = "truncate text-sm";
        nameSpan.textContent = item.name;

        left.appendChild(caret);
        left.appendChild(iconEl);
        left.appendChild(nameSpan);
        row.appendChild(left);

        const right = document.createElement("div");
        right.className = "flex items-center gap-1 shrink-0";

        if (recentlyOpenedPath === item.path) {
          const pill = document.createElement("span");
          pill.className = "agy-file-opened-pill";
          pill.textContent = "已打开";
          right.appendChild(pill);
        } else if (!item.isDir && item.size > 0) {
          const meta = document.createElement("span");
          meta.className = "agy-file-meta";
          meta.textContent = formatFileSize(item.size);
          right.appendChild(meta);
        }

        // Subtle 'More' button for touch/mobile Web and quick click
        const moreBtn = document.createElement("span");
        moreBtn.className = "agy-file-more-btn";
        moreBtn.title = "文件操作菜单";
        moreBtn.innerHTML = SVG_ICONS.moreHorizontal;
        moreBtn.onclick = (e) => {
          e.stopPropagation();
          e.preventDefault();
          selectedFilePath = item.path;
          const r = moreBtn.getBoundingClientRect();
          openFileContextMenu(item, r.left, r.bottom + 4);
        };
        right.appendChild(moreBtn);
        row.appendChild(right);

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
            if (isWebMode()) {
              window.open(`/__agy-plugin/file?path=${encodeURIComponent(item.path)}`, "_blank");
            } else {
              triggerOpenWithDefaultApp(item.path);
            }
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

    const actions = [];
    if (!item.isDir && isWebMode()) {
      actions.push(
        {
          svg: SVG_ICONS.externalLink,
          label: "在浏览器中打开 / 预览",
          onClick: () => window.open(`/__agy-plugin/file?path=${encodeURIComponent(item.path)}`, "_blank")
        },
        {
          svg: SVG_ICONS.download,
          label: "下载文件到当前设备",
          onClick: () => window.open(`/__agy-plugin/file?path=${encodeURIComponent(item.path)}&download=1`, "_blank")
        },
        { sep: true }
      );
    }

    actions.push(
      {
        svg: SVG_ICONS.finderOpen,
        label: isWebMode() ? "在 Mac Finder 中显示" : "在 Finder 中显示",
        onClick: () => triggerRevealInFinder(item.path)
      },
      {
        svg: SVG_ICONS.externalLink,
        label: isWebMode() ? "在 Mac 默认程序中打开" : "用系统默认程序打开",
        onClick: () => triggerOpenWithDefaultApp(item.path)
      },
      { sep: true },
      {
        svg: SVG_ICONS.copy,
        label: "复制完整路径",
        onClick: () => navigator.clipboard?.writeText(item.path)
      },
      {
        svg: SVG_ICONS.copy,
        label: "复制相对路径",
        onClick: () => {
          const root = currentFilesProject?.folderPath || "";
          const rel = item.path.startsWith(root + "/")
            ? item.path.slice(root.length + 1)
            : item.name;
          navigator.clipboard?.writeText(rel);
        }
      }
    );

    actions.forEach(act => {
      if (act.sep) {
        const sep = document.createElement("div");
        sep.className = "agy-ctx-sep";
        menu.appendChild(sep);
        return;
      }
      const el = document.createElement("div");
      el.className = "agy-ctx-item";
      el.innerHTML = `${act.svg}<span>${escapeHtml(act.label)}</span>`;
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

    const btnWrapper = nativeModelBtn.parentElement;
    const rowContainer = btnWrapper?.parentElement;
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

    let footer = rowContainer;
    while (footer && !footer.className?.includes?.("input-footer")) {
      footer = footer.parentElement;
    }
    const inputCard = footer?.parentElement;
    if (inputCard) {
      if (isPi) inputCard.classList.add("agy-pi-mode-ring");
      else inputCard.classList.remove("agy-pi-mode-ring");
    }

    const convId = getCurrentConversationId() || "global";
    const turns = activePiTurnsByConv.get(convId) || [];
    const runningTurn = turns.find(t => t.running);
    const sig = `${piEngineState.engine}|${piEngineState.model}|${runningTurn ? runningTurn.runId : "idle"}`;
    if (bar.getAttribute("data-sig") === sig) return;
    bar.setAttribute("data-sig", sig);
    bar.innerHTML = "";

    const sw = document.createElement("div");
    sw.className = "agy-engine-switch";

    const agyOpt = document.createElement("button");
    agyOpt.type = "button";
    agyOpt.className = "agy-engine-opt" + (!isPi ? " active-agy" : "");
    agyOpt.title = "使用本机 Antigravity (AGY) 引擎";
    agyOpt.innerHTML = `${SVG_ICONS.agyLogo}<span>AGY</span>`;
    agyOpt.onclick = (e) => {
      e.stopPropagation();
      setConvEngineState(getCurrentConversationId() || "global", "agy");
      renderPiEngineBar();
    };

    const piOpt = document.createElement("button");
    piOpt.type = "button";
    piOpt.className = "agy-engine-opt" + (isPi ? " active-pi" : "");
    piOpt.title = "切换到本机 Pi 引擎（可选全部第三方模型，共享当前项目与上下文）";
    piOpt.innerHTML = `${SVG_ICONS.piLogo}<span>Pi</span>`;
    piOpt.onclick = async (e) => {
      e.stopPropagation();
      setConvEngineState(getCurrentConversationId() || "global", "pi");
      await loadPiModelsIfNeeded();
      renderPiEngineBar();
    };

    sw.appendChild(agyOpt);
    sw.appendChild(piOpt);
    bar.appendChild(sw);

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
      if (runningTurn) {
        sendBtn.title = "Pi 正在运行中（点击可发送新消息，若输入框为空则停止当前运行）";
        sendBtn.innerHTML = `<span>运行中 · 发送 ↵</span>`;
      } else {
        sendBtn.title = "发送当前输入框内容给 Pi 执行 (快捷键: Enter)";
        sendBtn.innerHTML = `<span>发送 ↵</span>`;
      }
      // Prevent mousedown from stealing focus/selection from the Lexical editor
      sendBtn.onmousedown = (e) => {
        e.preventDefault();
      };
      sendBtn.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
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
            <span style="font-size:10px;opacity:0.55">${isSel ? "✓" : ""}</span>
          `;
          item.onclick = (e) => {
            e.stopPropagation();
            setConvEngineState(getCurrentConversationId() || "global", piEngineState.engine, m.fullId);
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

  function findActiveChatEditorElement() {
    const editors = Array.from(document.querySelectorAll('[data-lexical-editor="true"]'));
    if (editors.length === 0) return null;
    if (editors.length === 1) return editors[0];
    // Prefer the editor closest to #agy-pi-engine-bar or model-selector-trigger
    const trigger = document.querySelector('[data-testid="model-selector-trigger"]');
    let footer = trigger;
    while (footer && !footer.className?.includes?.("input-footer")) {
      footer = footer.parentElement;
    }
    const card = footer?.parentElement;
    const inCard = card?.querySelector?.('[data-lexical-editor="true"]');
    return inCard || editors[editors.length - 1];
  }

  function readAndClearChatInput() {
    const edEl = findActiveChatEditorElement();
    if (!edEl) return "";

    let text = "";
    const lex = edEl.__lexicalEditor;
    if (lex && typeof lex.getEditorState === "function") {
      try {
        lex.getEditorState().read(() => {
          const rootNode = lex._editorState?._nodeMap?.get("root");
          if (rootNode && typeof rootNode.getTextContent === "function") {
            text = rootNode.getTextContent();
          }
        });
      } catch (e) {}
    }

    if (!text) {
      text = edEl.__lexicalTextContent || edEl.innerText || edEl.textContent || "";
    }
    text = text.trim();
    if (!text) return "";

    // 1. Reliably clear via Lexical's discrete synchronous state update
    let clearedByLexical = false;
    if (lex && typeof lex.update === "function") {
      try {
        lex.update(() => {
          const root = lex._pendingEditorState?._nodeMap?.get("root");
          if (root && typeof root.clear === "function") {
            root.clear();
            clearedByLexical = true;
          }
        }, { discrete: true });
      } catch (e) {}
    }

    // 2. Fallback DOM selection clear if needed
    if (!clearedByLexical) {
      try {
        edEl.focus();
        const sel = window.getSelection();
        if (sel) {
          sel.selectAllChildren(edEl);
          document.execCommand("delete", false, null);
        }
      } catch (e) {}
    }

    return text;
  }

  // --- Pi Turns Chronological Native Interleaving & Shared Context ---
  const activePiTurnsByConv = new Map();
  const lastSyncedPiTsByConv = new Map();
  const piConvMetaByConv = new Map();
  let loadedConvIdForPi = null;
  let isDispatchingPiReduxSync = false;

  function formatSidebarShortTime(ms) {
    if (!ms) return "now";
    const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
    if (diffSec < 60) return "now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr <= 24) return `${diffHr}h`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 30) return `${diffDay}d`;
    if (diffDay < 365) return `${Math.floor(diffDay / 30)}mo`;
    return `${Math.floor(diffDay / 365)}y`;
  }

  function hookReduxStoreForPiMeta(store) {
    if (!store || reduxStoreUnsubscribe || typeof store.subscribe !== "function") return;
    try {
      reduxStoreUnsubscribe = store.subscribe(() => {
        if (isDispatchingPiReduxSync) return;
        syncPiMetaToReduxStore(false);
      });
    } catch (e) {}
  }

  function syncPiMetaToReduxStore(shouldDispatch = true) {
    if (isDispatchingPiReduxSync) return;
    if (!cachedReduxStore) {
      findReactProviders();
    }
    const store = cachedReduxStore;
    if (!store || typeof store.getState !== "function") return;
    const st = store.getState();
    const origTs = st?.trajectorySummaries;
    if (!origTs || !origTs.summaries) return;

    let changed = false;
    let nextSummaries = origTs.summaries;
    let nextActive = origTs.indexes?.active || {};
    let activeChanged = false;

    for (const [convId, meta] of piConvMetaByConv.entries()) {
      if (!convId || convId === "global") continue;
      const sum = nextSummaries[convId];
      if (!sum) continue;

      const origAgySec = Number(sum.__agyOrigModSec ?? sum.lastModifiedTime?.seconds ?? 0);
      const curModSec = Number(sum.lastModifiedTime?.seconds || 0);
      const piSec = Math.floor(Number(meta.lastTimestamp || 0) / 1000);
      const isPiRunning = Boolean(meta.running);

      const needsTimeSync = piSec > 0 && piSec > curModSec && piSec >= origAgySec;
      const needsRunStart = isPiRunning && (sum.status !== 2 || !nextActive[convId]);
      const needsRunEnd = !isPiRunning && Boolean(sum.__agyPiRunningOverride);

      if (!needsTimeSync && !needsRunStart && !needsRunEnd) continue;

      if (!changed) {
        nextSummaries = { ...origTs.summaries };
        changed = true;
      }

      const updatedSum = {
        ...sum,
        __agyOrigModSec: origAgySec
      };

      if (piSec > 0 && piSec >= origAgySec && piSec >= curModSec) {
        const tsBig = BigInt(piSec);
        const viewBig = BigInt(piSec + 1);
        updatedSum.lastModifiedTime = {
          ...(sum.lastModifiedTime || { $typeName: "google.protobuf.Timestamp" }),
          seconds: tsBig,
          nanos: 0
        };
        updatedSum.lastUserInputTime = {
          ...(sum.lastUserInputTime || sum.lastModifiedTime || { $typeName: "google.protobuf.Timestamp" }),
          seconds: tsBig,
          nanos: 0
        };
        const curViewSec = Number(sum.annotations?.lastUserViewTime?.seconds || 0);
        if (curViewSec <= piSec) {
          updatedSum.annotations = {
            ...(sum.annotations || { $typeName: "exa.jetski_cortex_pb.ConversationAnnotations", tags: [], cls: [] }),
            lastUserViewTime: {
              $typeName: "google.protobuf.Timestamp",
              seconds: viewBig,
              nanos: 0
            }
          };
        }
      }

      if (isPiRunning) {
        updatedSum.status = 2;
        updatedSum.notFullyIdle = true;
        updatedSum.__agyPiRunningOverride = true;
        if (!nextActive[convId]) {
          if (!activeChanged) {
            nextActive = { ...nextActive };
            activeChanged = true;
          }
          nextActive[convId] = true;
        }
      } else if (sum.__agyPiRunningOverride) {
        updatedSum.status = 1;
        updatedSum.notFullyIdle = false;
        updatedSum.__agyPiRunningOverride = false;
        if (nextActive[convId]) {
          if (!activeChanged) {
            nextActive = { ...nextActive };
            activeChanged = true;
          }
          delete nextActive[convId];
        }
      }

      nextSummaries[convId] = updatedSum;
    }

    if (changed || activeChanged) {
      isDispatchingPiReduxSync = true;
      try {
        st.trajectorySummaries = {
          ...origTs,
          indexes: activeChanged
            ? { ...(origTs.indexes || {}), active: nextActive }
            : origTs.indexes,
          summaries: nextSummaries
        };
        if (shouldDispatch && typeof store.dispatch === "function") {
          store.dispatch({ type: "@@AGY_PI_SYNC_SUMMARY" });
        }
      } catch (e) {} finally {
        isDispatchingPiReduxSync = false;
      }
    }
  }

  function decorateSidebarConversationRows() {
    const rows = document.querySelectorAll('[data-testid="conversation-row-sidebar"][data-cascade-id]');
    if (!rows.length) return;
    const summaries = cachedReduxStore?.getState?.()?.trajectorySummaries?.summaries || {};

    rows.forEach(row => {
      const cid = row.getAttribute("data-cascade-id");
      if (!cid) return;
      const meta = piConvMetaByConv.get(cid);
      if (!meta) return;

      const slot = row.querySelector(".flex.items-center.gap-1\\.5.group-hover\\:opacity-0");
      if (!slot) return;

      if (meta.running) {
        if (!slot.querySelector('[data-testid="status-loading-spinner"]')) {
          slot.setAttribute("data-agy-pi-spinner", "1");
          slot.innerHTML = SVG_ICONS.statusSpinner;
        }
        return;
      }

      const sum = summaries[cid];
      const isAgyNativelyRunning = sum && sum.status === 2 && !sum.__agyPiRunningOverride;
      if (isAgyNativelyRunning) return;

      if (meta.lastTimestamp > 0) {
        const origAgySec = Number(sum?.__agyOrigModSec ?? sum?.lastModifiedTime?.seconds ?? 0);
        const piSec = Math.floor(meta.lastTimestamp / 1000);
        if (piSec >= origAgySec) {
          const shortTime = formatSidebarShortTime(meta.lastTimestamp);
          const hasPiSpinner =
            slot.getAttribute("data-agy-pi-spinner") === "1" ||
            Boolean(slot.querySelector('[data-testid="status-loading-spinner"]'));
          const volatileEl = slot.querySelector('[data-screenshot-volatile="true"]');
          if (hasPiSpinner || !volatileEl) {
            slot.removeAttribute("data-agy-pi-spinner");
            slot.innerHTML = `<span data-screenshot-volatile="true" class="text-xs text-foreground opacity-60 min-w-4">${escapeHtml(shortTime)}</span>`;
          } else if (volatileEl.textContent !== shortTime) {
            volatileEl.textContent = shortTime;
          }
        }
      }
    });
  }

  function syncPiStatusToReduxAndSidebar() {
    syncPiMetaToReduxStore(true);
    decorateSidebarConversationRows();
  }

  function updatePiConvMetaFromTurns(convId, turns) {
    if (!convId || convId === "global" || !Array.isArray(turns) || turns.length === 0) return;
    let lastTimestamp = 0;
    let lastModel = null;
    let running = false;
    for (const t of turns) {
      if (!t) continue;
      if (t.running) running = true;
      const ts = Math.max(Number(t.completedAt) || 0, getPiTurnStartMs(t));
      if (ts >= lastTimestamp) {
        lastTimestamp = ts;
        if (t.model) lastModel = t.model;
      }
    }
    if (lastTimestamp > 0 || running) {
      const prev = piConvMetaByConv.get(convId) || {};
      piConvMetaByConv.set(convId, {
        lastTimestamp: Math.max(prev.lastTimestamp || 0, lastTimestamp),
        running,
        lastModel: lastModel || prev.lastModel || null
      });
      syncPiStatusToReduxAndSidebar();
    }
  }

  async function loadPiConvMeta() {
    try {
      const metaObj = await callBridge("getPiConvMeta");
      if (metaObj && typeof metaObj === "object") {
        for (const [cid, m] of Object.entries(metaObj)) {
          if (!cid || !m) continue;
          const prev = piConvMetaByConv.get(cid) || {};
          piConvMetaByConv.set(cid, {
            lastTimestamp: Math.max(prev.lastTimestamp || 0, Number(m.lastTimestamp) || 0),
            running: Boolean(m.running || prev.running),
            lastModel: m.lastModel || prev.lastModel || null
          });
        }
        syncPiStatusToReduxAndSidebar();
        const curConvId = getCurrentConversationId();
        if (curConvId) {
          syncEngineStateForConv(curConvId);
        }
      }
    } catch (e) {}
  }

  function getPiTurnStartMs(t) {
    if (!t) return 0;
    if (t.startedAt && Number(t.startedAt) > 0) return Number(t.startedAt);
    const m = String(t.turnId || "").match(/^pi_turn_(\d+)$/);
    if (m) return parseInt(m[1], 10);
    return Number(t.timestamp) || 0;
  }

  function getAgyTurnTimestampMs(turnEl) {
    if (!turnEl) return 0;
    if (turnEl.__agyCachedTs) return turnEl.__agyCachedTs;
    try {
      const fk = Object.keys(turnEl).find(k => k.startsWith("__reactFiber$"));
      let cur = fk ? turnEl[fk] : null;
      for (let i = 0; i < 7 && cur; i++) {
        const c = cur.memoizedProps?.container;
        const createdAt = c?.steps?.[0]?.metadata?.createdAt;
        if (createdAt && createdAt.seconds !== undefined) {
          const sec = Number(createdAt.seconds);
          const nanos = Number(createdAt.nanos || 0);
          if (sec > 0) {
            const ms = sec * 1000 + Math.round(nanos / 1e6);
            turnEl.__agyCachedTs = ms;
            return ms;
          }
        }
        cur = cur.return;
      }
    } catch (e) {}
    return 0;
  }

  function getNativeConversationTurnList() {
    const vp = document.querySelector('[data-testid="autoscroll-viewport"]');
    if (!vp) return null;
    const srHeading = vp.querySelector("h1.sr-only");
    if (srHeading && srHeading.parentElement) {
      return { scrollArea: vp, turnList: srHeading.parentElement };
    }
    const fallbackList = vp.querySelector(".flex.flex-col.gap-y-3");
    if (fallbackList) {
      return { scrollArea: vp, turnList: fallbackList };
    }
    return null;
  }

  function stripHiddenPiContextInUserBubbles() {
    const bubbles = document.querySelectorAll('[data-testid="user-input-step"] [data-quotable="true"]');
    bubbles.forEach(el => {
      const raw = el.textContent || "";
      if (!raw.includes("<PI_SHARED_CONTEXT>") && !raw.includes("[系统上下文同步：")) return;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
      let node;
      while ((node = walker.nextNode())) {
        if (
          node.nodeValue &&
          (node.nodeValue.includes("<PI_SHARED_CONTEXT>") || node.nodeValue.includes("[系统上下文同步："))
        ) {
          node.nodeValue = node.nodeValue
            .replace(/\s*<PI_SHARED_CONTEXT>[\s\S]*?<\/PI_SHARED_CONTEXT>/g, "")
            .replace(/\s*\[系统上下文同步：[\s\S]*?\]/g, "");
        }
      }
    });
  }

  function extractAgyDomTurns() {
    const native = getNativeConversationTurnList();
    if (!native) return [];
    const { turnList } = native;
    const agyEls = Array.from(turnList.children).filter(
      el => el.tagName === "DIV" && !el.classList.contains("agy-pi-native-turn")
    );
    const results = [];
    for (const el of agyEls) {
      const ts = getAgyTurnTimestampMs(el);
      const userEl = el.querySelector('[data-testid="user-input-step"] [data-quotable="true"]');
      const agentEl = el.querySelector('[role="article"][aria-label="Agent response"] .leading-relaxed');
      const prompt = (userEl?.innerText || userEl?.textContent || "")
        .replace(/\s*<PI_SHARED_CONTEXT>[\s\S]*?<\/PI_SHARED_CONTEXT>/g, "")
        .replace(/\s*\[系统上下文同步：[\s\S]*?\]/g, "")
        .trim();
      const response = (agentEl?.innerText || agentEl?.textContent || "").trim();
      if (prompt) {
        results.push({ ts, prompt, response });
      }
    }
    return results;
  }

  function formatInlineMarkdown(escapedLine) {
    return escapedLine
      .replace(/`([^`]+)`/g, '<code class="whitespace-pre-wrap" style="word-break: break-word;">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  }

  function renderSimpleMarkdown(rawText) {
    if (!rawText) return "";
    const segments = String(rawText).split(/(```[\s\S]*?```)/g);
    const htmlParts = [];

    for (const seg of segments) {
      if (seg.startsWith("```") && seg.endsWith("```")) {
        const lines = seg.slice(3, -3).replace(/^\r?\n/, "");
        const firstNewline = lines.indexOf("\n");
        const codeBody = firstNewline >= 0 && !lines.slice(0, firstNewline).includes(" ")
          ? lines.slice(firstNewline + 1)
          : lines;
        htmlParts.push(`<pre class="agy-pi-md-pre"><code>${escapeHtml(codeBody)}</code></pre>`);
        continue;
      }

      const blocks = seg.trim().split(/\n{2,}/);
      for (const blk of blocks) {
        const trimmed = blk.trim();
        if (!trimmed) continue;
        const lines = trimmed.split(/\r?\n/);

        if (lines.every(l => /^>\s?/.test(l))) {
          const inner = lines.map(l => formatInlineMarkdown(escapeHtml(l.replace(/^>\s?/, "")))).join("<br>");
          htmlParts.push(`<blockquote class="agy-pi-md-blockquote"><p>${inner}</p></blockquote>`);
        } else if (lines.length === 1 && /^#{1,4}\s+/.test(lines[0])) {
          const m = lines[0].match(/^(#{1,4})\s+(.*)$/);
          const lvl = Math.min(4, m[1].length);
          htmlParts.push(`<h${lvl}>${formatInlineMarkdown(escapeHtml(m[2]))}</h${lvl}>`);
        } else if (lines.every(l => /^[-*]\s+/.test(l))) {
          const items = lines
            .map(l => `<li>${formatInlineMarkdown(escapeHtml(l.replace(/^[-*]\s+/, "")))}</li>`)
            .join("");
          htmlParts.push(`<ul>${items}</ul>`);
        } else {
          const pInner = lines.map(l => formatInlineMarkdown(escapeHtml(l))).join("<br>");
          htmlParts.push(`<p>${pInner}</p>`);
        }
      }
    }

    return htmlParts.join("");
  }

  function formatTurnClockTime(ms) {
    if (!ms) return "";
    const d = new Date(ms);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  function formatRelativeTimeAgo(ms) {
    if (!ms) return "just now";
    const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
    if (diffSec < 45) return "just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${Math.floor(diffHr / 24)}d ago`;
  }

  function buildNativePiTurnElement(t, existingEl) {
    const turnEl = existingEl || document.createElement("div");
    turnEl.className = "flex items-start agy-pi-native-turn";
    turnEl.setAttribute("data-pi-turn-id", t.turnId);
    const startMs = getPiTurnStartMs(t);
    turnEl.setAttribute("data-pi-ts", String(startMs));

    const toolsCount = Array.isArray(t.tools) ? t.tools.length : 0;
    const respText = t.response || "";
    const sig = `${t.running ? 1 : 0}:${toolsCount}:${respText.length}:${t.model || ""}`;
    if (turnEl.getAttribute("data-pi-sig") === sig) {
      return turnEl;
    }
    turnEl.setAttribute("data-pi-sig", sig);

    const shortModel = (t.model || "claude-haiku-5.5").split("/").pop();
    const clockTime = formatTurnClockTime(startMs);
    const relTime = formatRelativeTimeAgo(t.completedAt || startMs);
    const durationSec = t.completedAt && startMs && t.completedAt > startMs
      ? Math.max(1, Math.round((t.completedAt - startMs) / 1000))
      : null;

    const statusLabel = t.running
      ? `Thinking${toolsCount > 0 ? ` · ${toolsCount} tool${toolsCount > 1 ? "s" : ""}` : "..."}`
      : durationSec
        ? `Worked for ${durationSec}s${toolsCount > 0 ? ` · ${toolsCount} tool${toolsCount > 1 ? "s" : ""}` : ""}`
        : `Completed${toolsCount > 0 ? ` · ${toolsCount} tool${toolsCount > 1 ? "s" : ""}` : ""}`;

    const toolsHtml = toolsCount > 0
      ? `<div class="agy-pi-tools-list">${t.tools
          .map(tl => `<span class="agy-pi-tool-pill">${escapeHtml(tl.name)}: ${escapeHtml(tl.summary || "")}</span>`)
          .join("")}</div>`
      : "";

    const renderedBody = respText
      ? renderSimpleMarkdown(respText)
      : `<p class="text-muted-foreground">${t.running ? "Pi 正在思考并处理上下文..." : ""}</p>`;

    turnEl.innerHTML = `
      <div class="flex flex-col gap-0.5 w-full scroll-mt-4">
        <div role="article" aria-label="User message" class="sticky top-0 z-10 mb-4">
          <div class="relative bg-background md-sticky-message-bleed after:content-[''] after:absolute after:left-0 after:right-0 after:top-full after:h-7 after:bg-gradient-to-b after:from-background after:to-transparent after:pointer-events-none">
            <div class="flex w-full flex-row">
              <div class="flex min-w-0 grow flex-col">
                <div data-testid="user-input-step" class="flex flex-col w-full gap-2 group/user-input-step pt-4">
                  <div class="w-full">
                    <div data-testid="lifted-context-menu-trigger" class="relative p-px rounded-xl bg-card-border">
                      <div class="relative flex flex-row items-center gap-2 p-1.5 rounded-[calc(theme(borderRadius.xl)-1px)] bg-card overflow-hidden">
                        <div class="flex-1 p-0.5 max-h-[10vh] overflow-hidden">
                          <div data-quotable="true" class="whitespace-pre-wrap text-sm" style="word-break: break-word;">${escapeHtml(t.prompt || "")}</div>
                        </div>
                        <div class="absolute bottom-0.5 right-0.5 flex flex-row items-center p-1 rounded-full opacity-0 pointer-events-none group-hover/user-input-step:opacity-100 group-hover/user-input-step:pointer-events-auto transition-all bg-card user-input-buttons-shadow user-input-buttons-container select-none">
                          <span class="text-xs text-muted-foreground mr-2 self-center">${escapeHtml(clockTime)}</span>
                          <button type="button" aria-label="Copy" class="agy-pi-copy-user-btn text-muted-foreground hover:text-secondary-foreground transition-opacity pointer-events-auto p-1 cursor-pointer">
                            ${SVG_ICONS.copy}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div role="article" aria-label="Agent response" data-quotable="true">
          <div class="relative agy-pi-worked-row">
            <div class="agy-pi-engine-inline-tag">
              ${SVG_ICONS.piLogo}
              <span>Pi · ${escapeHtml(shortModel)}</span>
              <span style="opacity:0.45">·</span>
              <span>${escapeHtml(statusLabel)}</span>
            </div>
            ${t.running && t.runId ? `<button type="button" class="agy-pi-stop-btn">停止</button>` : ""}
          </div>
          ${toolsHtml}
          <div class="px-2 py-1">
            <div class="leading-relaxed select-text text-sm flex flex-col [&_strong]:font-semibold [&_b]:font-semibold [&_code:not(pre_code)]:bg-muted [&_code:not(pre_code)]:text-code [&_code:not(pre_code)]:rounded [&_code:not(pre_code)]:px-1 [&_code:not(pre_code)]:py-0.5 [&_code:not(pre_code)]:text-[0.9em] [&_h1]:text-xl [&_h2]:text-lg [&_h3]:text-base [&_h4]:text-sm [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-medium [&_h4]:font-medium [&_ul]:my-2 [&_ol]:my-2 [&_ul]:pl-4 [&_ol]:pl-4 [&_ul]:list-disc [&_ol]:list-decimal break-words gap-2">
              ${renderedBody}
            </div>
          </div>
          <div class="pt-3">
            <div class="flex flex-col gap-2" data-testid="cascade-system-message-toolbar">
              <div class="flex w-full flex-wrap items-center justify-between gap-x-1 gap-y-0.5 pl-2 pr-1">
                <div class="flex min-w-0 flex-wrap-reverse items-center justify-end gap-x-1 gap-y-0.5 ml-auto">
                  <span class="text-xs text-muted-foreground select-none px-1 whitespace-nowrap">${escapeHtml(relTime)}</span>
                  <div class="flex shrink-0 items-center">
                    <button type="button" aria-label="Copy" class="agy-pi-copy-resp-btn inline-flex items-center font-medium transition-colors select-none outline-none cursor-pointer justify-center bg-transparent text-muted-foreground hover:text-foreground hover:bg-secondary h-6 w-6 shrink-0 rounded-md">
                      ${SVG_ICONS.copy}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const stopBtn = turnEl.querySelector(".agy-pi-stop-btn");
    if (stopBtn && t.runId) {
      stopBtn.onclick = () => callBridge("stopPiRun", { runId: t.runId });
    }
    const copyUserBtn = turnEl.querySelector(".agy-pi-copy-user-btn");
    if (copyUserBtn) {
      copyUserBtn.onclick = () => navigator.clipboard?.writeText?.(t.prompt || "");
    }
    const copyRespBtn = turnEl.querySelector(".agy-pi-copy-resp-btn");
    if (copyRespBtn) {
      copyRespBtn.onclick = () => navigator.clipboard?.writeText?.(t.response || "");
    }

    return turnEl;
  }

  function findFallbackHomeContainer() {
    const convView = document.querySelector('[data-testid="conversation-view"]');
    const trigger = document.querySelector('[data-testid="model-selector-trigger"]');
    if (convView && trigger && convView.contains(trigger)) {
      let inputTopBlock = trigger;
      while (inputTopBlock && inputTopBlock.parentElement !== convView) {
        inputTopBlock = inputTopBlock.parentElement;
      }
      let container = document.getElementById("agy-pi-turns-container");
      if (!container) {
        container = document.createElement("div");
        container.id = "agy-pi-turns-container";
      }
      container.style.maxHeight = "56vh";
      container.style.overflowY = "auto";
      if (inputTopBlock && container.nextSibling !== inputTopBlock) {
        convView.insertBefore(container, inputTopBlock);
      } else if (!inputTopBlock && container.parentElement !== convView) {
        convView.appendChild(container);
      }
      return container;
    }
    return null;
  }

  let lastEngineSyncKey = "";

  function syncEngineStateForConv(convId) {
    const key = convId || "global";
    const turns = activePiTurnsByConv.get(key) || [];
    const meta = piConvMetaByConv.get(key);
    let maxPiTs = Number(meta?.lastTimestamp) || 0;
    let lastPiModel = meta?.lastModel || null;
    for (const pt of turns) {
      const ts = Math.max(Number(pt.completedAt) || 0, getPiTurnStartMs(pt));
      if (ts >= maxPiTs) {
        maxPiTs = ts;
        if (pt.model) lastPiModel = pt.model;
      }
    }

    let maxAgyTs = 0;
    let agyCount = 0;
    const native = getNativeConversationTurnList();
    if (native && native.turnList) {
      for (const child of native.turnList.children) {
        if (child.tagName === "DIV" && !child.classList.contains("agy-pi-native-turn")) {
          agyCount++;
          const ts = getAgyTurnTimestampMs(child);
          if (ts > maxAgyTs) maxAgyTs = ts;
        }
      }
    }
    if (maxAgyTs === 0 && key !== "global") {
      const sum = cachedReduxStore?.getState?.()?.trajectorySummaries?.summaries?.[key];
      if (sum) {
        const origSec = sum.__agyOrigModSec !== undefined
          ? Number(sum.__agyOrigModSec)
          : Number(sum.lastModifiedTime?.seconds || 0);
        if (origSec > 0 && (!maxPiTs || Math.abs(origSec - Math.floor(maxPiTs / 1000)) > 2)) {
          maxAgyTs = origSec * 1000;
        }
      }
    }

    const savedEntry = piEngineState.byConv?.[key];
    let targetEngine = "agy";
    let targetModel = piEngineState.model || "surplus/claude-haiku-5.5";

    if (savedEntry && (savedEntry.updatedAt || 0) >= Math.max(maxAgyTs, maxPiTs)) {
      targetEngine = savedEntry.engine === "pi" ? "pi" : "agy";
      if (savedEntry.model) targetModel = savedEntry.model;
    } else if (maxPiTs > 0 && maxPiTs > maxAgyTs) {
      targetEngine = "pi";
      if (lastPiModel) targetModel = lastPiModel;
    } else if ((turns.length > 0 || maxPiTs > 0) && agyCount === 0 && maxAgyTs === 0) {
      targetEngine = "pi";
      if (lastPiModel) targetModel = lastPiModel;
    } else {
      targetEngine = "agy";
      if (savedEntry?.model) targetModel = savedEntry.model;
      else if (lastPiModel) targetModel = lastPiModel;
    }

    if (piEngineState.engine !== targetEngine || piEngineState.model !== targetModel) {
      piEngineState.engine = targetEngine;
      piEngineState.model = targetModel;
      savePiEngineState();
      renderPiEngineBar();
    }
  }

  async function ensurePiTurnsLoadedForCurrentConv() {
    const convId = getCurrentConversationId() || "global";
    syncEngineStateForConv(convId);
    if (loadedConvIdForPi === convId && activePiTurnsByConv.has(convId)) {
      renderPiTurnsInDom(false);
      return;
    }
    loadedConvIdForPi = convId;
    try {
      const saved = await callBridge("getPiTurns", { conversationId: convId });
      const turns = Array.isArray(saved) ? saved : [];
      activePiTurnsByConv.set(convId, turns);
      updatePiConvMetaFromTurns(convId, turns);
      syncEngineStateForConv(convId);
      renderPiTurnsInDom(false);
    } catch (e) {}
  }

  function renderPiTurnsInDom(autoScroll = false) {
    const convId = getCurrentConversationId() || "global";
    const turns = activePiTurnsByConv.get(convId) || [];
    const native = getNativeConversationTurnList();
    const agyCount = native && native.turnList
      ? Array.from(native.turnList.children).filter(
          el => el.tagName === "DIV" && !el.classList.contains("agy-pi-native-turn")
        ).length
      : 0;
    const syncKey = `${convId}:${agyCount}:${turns.length}`;
    if (syncKey !== lastEngineSyncKey) {
      lastEngineSyncKey = syncKey;
      syncEngineStateForConv(convId);
    }

    renderPiEngineBar();
    stripHiddenPiContextInUserBubbles();

    // Case 1: Active conversation stream exists -> interleave Pi turns chronologically inside turnList!
    if (native && native.turnList) {
      const legacyBox = document.getElementById("agy-pi-turns-container");
      if (legacyBox) legacyBox.remove();

      const { scrollArea, turnList } = native;
      const validIds = new Set(turns.map(t => t.turnId));

      // Remove stale Pi turn elements from other conversations
      turnList.querySelectorAll(".agy-pi-native-turn").forEach(el => {
        if (!validIds.has(el.getAttribute("data-pi-turn-id"))) {
          el.remove();
        }
      });

      if (turns.length === 0) return;

      const sortedTurns = [...turns].sort((a, b) => getPiTurnStartMs(a) - getPiTurnStartMs(b));

      // Place turns from newest to oldest so refNode lookup is always deterministic and idempotent
      for (let i = sortedTurns.length - 1; i >= 0; i--) {
        const t = sortedTurns[i];
        const startMs = getPiTurnStartMs(t);
        const existingEl = turnList.querySelector(`.agy-pi-native-turn[data-pi-turn-id="${t.turnId}"]`);
        const turnEl = buildNativePiTurnElement(t, existingEl);

        // Find the first turn child in turnList (native AGY turn or newer Pi turn) whose timestamp > startMs
        const children = Array.from(turnList.children).filter(
          el => el.tagName === "DIV" && el !== turnEl
        );
        let refNode = null;
        for (const child of children) {
          const childTs = child.classList.contains("agy-pi-native-turn")
            ? Number(child.getAttribute("data-pi-ts") || 0)
            : getAgyTurnTimestampMs(child);
          if (childTs > startMs) {
            refNode = child;
            break;
          }
        }

        if (refNode) {
          if (turnEl.parentElement !== turnList || turnEl.nextElementSibling !== refNode) {
            turnList.insertBefore(turnEl, refNode);
          }
        } else {
          if (turnEl.parentElement !== turnList || turnList.lastElementChild !== turnEl) {
            turnList.appendChild(turnEl);
          }
        }
      }

      if (autoScroll) {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }
      return;
    }

    // Case 2: Fallback for Project Home / New Conversation screen where no native turnList exists yet
    const fallbackBox = findFallbackHomeContainer();
    if (!fallbackBox) return;
    if (turns.length === 0) {
      fallbackBox.style.display = "none";
      fallbackBox.innerHTML = "";
      return;
    }
    fallbackBox.style.display = "flex";
    fallbackBox.innerHTML = "";
    for (const t of turns) {
      fallbackBox.appendChild(buildNativePiTurnElement(t, null));
    }
    if (autoScroll) {
      fallbackBox.scrollTop = fallbackBox.scrollHeight;
    }
  }

  function getUnsyncedPiTurnsForConv(convId) {
    if (!convId) return [];
    const piTurns = activePiTurnsByConv.get(convId) || [];
    if (piTurns.length === 0) return [];

    // Find latest native AGY turn timestamp in DOM
    let maxAgyTs = 0;
    const native = getNativeConversationTurnList();
    if (native && native.turnList) {
      for (const child of native.turnList.children) {
        if (child.tagName === "DIV" && !child.classList.contains("agy-pi-native-turn")) {
          const ts = getAgyTurnTimestampMs(child);
          if (ts > maxAgyTs) maxAgyTs = ts;
        }
      }
    }

    const sinceTs = Math.max(maxAgyTs, lastSyncedPiTsByConv.get(convId) || 0);
    return piTurns.filter(t => !t.running && t.prompt && getPiTurnStartMs(t) > sinceTs);
  }

  function syncPiTurnsIntoLexicalBeforeSend(edEl) {
    const convId = getCurrentConversationId();
    if (!convId || !edEl) return;
    const unsynced = getUnsyncedPiTurnsForConv(convId);
    if (unsynced.length === 0) return;

    const lex = edEl.__lexicalEditor;
    if (!lex || typeof lex.update !== "function") return;

    const lines = [
      "<PI_SHARED_CONTEXT>",
      "[Shared Conversation Context — The user conducted the following turn(s) with the Pi engine in this same chat stream immediately prior to this message. Treat them as part of our direct conversation history without needing to run file-reading tools:]"
    ];
    for (const pt of unsynced.slice(-6)) {
      const timeStr = formatTurnClockTime(getPiTurnStartMs(pt));
      lines.push(`- [${timeStr} | Pi (${pt.model || "claude-haiku-5.5"})] User: ${pt.prompt}`);
      if (Array.isArray(pt.tools) && pt.tools.length > 0) {
        lines.push(`  Tools Executed: ${pt.tools.map(tl => `${tl.name}(${tl.summary || ""})`).join(", ")}`);
      }
      if (pt.response) {
        lines.push(`  Pi Response: ${pt.response.replace(/\s+/g, " ").slice(0, 1200)}`);
      }
    }
    lines.push("</PI_SHARED_CONTEXT>");
    const ctxBlock = `\n\n${lines.join("\n")}`;

    try {
      lex.update(() => {
        const map = lex._pendingEditorState?._nodeMap;
        if (!map) return;
        let lastTextNode = null;
        for (const node of map.values()) {
          if (node.__type === "text" && typeof node.setTextContent === "function") {
            lastTextNode = node;
          }
        }
        if (lastTextNode) {
          const curText = lastTextNode.getTextContent();
          if (curText.trim() && !curText.includes("<PI_SHARED_CONTEXT>")) {
            lastTextNode.setTextContent(curText + ctxBlock);
            lastSyncedPiTsByConv.set(convId, Date.now());
          }
        }
      }, { discrete: true });
    } catch (e) {}
  }

  window.__agyPiStreamEvent = function(evt) {
    if (!evt) return;

    // Real-time tag sync across Desktop & Web
    if (evt.type === "tags_updated" && evt.config) {
      state = evt.config;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {}
      const found = findReactProviders();
      if (found) applyTagFilterToRpp(found.rpp);
      renderTagBar();
      decorateProjectCards();
      return;
    }

    if (!evt.turnId) return;
    const convId = evt.conversationId || getCurrentConversationId() || "global";
    let list = activePiTurnsByConv.get(convId);
    if (!list) {
      list = [];
      activePiTurnsByConv.set(convId, list);
    }

    if (evt.type === "turn_init" && evt.turn) {
      if (!list.some(t => t.turnId === evt.turnId)) {
        list.push(evt.turn);
      }
      updatePiConvMetaFromTurns(convId, list);
      renderPiTurnsInDom(true);
      return;
    }

    let turn = list.find(t => t.turnId === evt.turnId);
    if (!turn) {
      turn = {
        turnId: evt.turnId,
        runId: evt.runId,
        conversationId: convId,
        model: piEngineState.model,
        prompt: "",
        response: "",
        tools: [],
        running: true,
        startedAt: evt.startedAt || Date.now(),
        timestamp: evt.timestamp || Date.now()
      };
      list.push(turn);
    }

    if (evt.type === "text_delta") {
      turn.response = evt.fullResponse || (turn.response || "") + (evt.delta || "");
      updatePiConvMetaFromTurns(convId, list);
      renderPiTurnsInDom(true);
    } else if (evt.type === "tool_start") {
      if (!Array.isArray(turn.tools)) turn.tools = [];
      turn.tools.push({ name: evt.toolName, summary: evt.summary });
      updatePiConvMetaFromTurns(convId, list);
      renderPiTurnsInDom(true);
    } else if (evt.type === "done") {
      turn.running = false;
      turn.completedAt = evt.completedAt || Date.now();
      if (evt.fullResponse) turn.response = evt.fullResponse;
      updatePiConvMetaFromTurns(convId, list);
      renderPiTurnsInDom(true);
      refreshProjectFiles(true);
    } else if (evt.type === "error") {
      turn.running = false;
      turn.completedAt = evt.completedAt || Date.now();
      turn.response = (turn.response ? turn.response + "\n\n" : "") + `错误: ${evt.error}`;
      updatePiConvMetaFromTurns(convId, list);
      renderPiTurnsInDom(true);
    }
  };

  async function submitPromptToPi() {
    const prompt = readAndClearChatInput();
    if (!prompt) {
      const edEl = findActiveChatEditorElement();
      if (edEl) edEl.focus();
      const sendBtn = document.getElementById("agy-pi-send-btn");
      if (sendBtn) {
        const origHtml = sendBtn.innerHTML;
        sendBtn.innerHTML = `<span>请先输入内容</span>`;
        setTimeout(() => {
          if (sendBtn.isConnected) sendBtn.innerHTML = origHtml;
        }, 1000);
      }
      return;
    }

    const nowMs = Date.now();
    const convId = getCurrentConversationId() || "global";
    const activeProj = detectCurrentActiveProject();
    const projectPath = activeProj?.folderPath || "";
    const model = piEngineState.model || "surplus/claude-haiku-5.5";
    setConvEngineState(convId, "pi", model);
    const turnId = `pi_turn_${nowMs}`;
    const runId = `pi_run_${nowMs}`;
    const agyDomTurns = extractAgyDomTurns();

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
      startedAt: nowMs,
      timestamp: nowMs
    };
    list.push(newTurn);
    activePiTurnsByConv.set(convId, list);
    updatePiConvMetaFromTurns(convId, list);
    renderPiTurnsInDom(true);

    try {
      await callBridge("runPiPrompt", {
        runId,
        turnId,
        conversationId: convId,
        projectPath,
        model,
        prompt,
        startedAt: nowMs,
        agyDomTurns
      });
    } catch (e) {
      newTurn.running = false;
      newTurn.completedAt = Date.now();
      newTurn.response = `启动 Pi 失败: ${e.message}`;
      updatePiConvMetaFromTurns(convId, list);
      renderPiTurnsInDom(true);
    }
  }

  // Intercept clicks on Antigravity's native right-side Send button for both Pi mode and AGY shared context sync
  const onClickCapture = (e) => {
    const btn = e.target?.closest?.("button");
    if (!btn) return;
    const tooltipId = btn.getAttribute("data-tooltip-id") || "";
    const ariaLabel = (btn.getAttribute("aria-label") || "").toLowerCase();
    const isNativeSendBtn =
      tooltipId.includes("input-send-button-send") ||
      (ariaLabel.includes("send") && Boolean(btn.closest('[class*="input-footer"]')));
    if (!isNativeSendBtn) return;

    if (piEngineState.engine === "pi") {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      submitPromptToPi();
    } else {
      setConvEngineState(getCurrentConversationId() || "global", "agy");
      const edEl = findActiveChatEditorElement();
      if (edEl) {
        syncPiTurnsIntoLexicalBeforeSend(edEl);
      }
    }
  };
  window.addEventListener("click", onClickCapture, true);

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

      setConvEngineState(getCurrentConversationId() || "global", "agy");
      syncPiTurnsIntoLexicalBeforeSend(edEl);
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
    const dropWrap = cardBtn.closest("[data-sidebar-section-drop-id]");
    if (dropWrap) {
      const dropId = dropWrap.getAttribute("data-sidebar-section-drop-id");
      if (dropId && dropId !== "main-section-header") return dropId;
    }
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
          tagBtn.innerHTML = SVG_ICONS.tag;
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
    syncPiStatusToReduxAndSidebar();
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
      renderPiTurnsInDom(false);
      decorateProjectCards();
      decorateSidebarConversationRows();
    });
  });

  let sidebarTimeTicker = null;

  async function startObserver() {
    ensureStyles();
    ensureWebEventSource();
    if (isWebMode()) {
      try {
        const latestCfg = await callBridge("getTags");
        if (latestCfg && Array.isArray(latestCfg.tags)) {
          state = latestCfg;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        }
      } catch (e) {}
    }
    loadPiModelsIfNeeded();
    loadPiConvMeta();
    refreshAll();
    observer.observe(document.body, { childList: true, subtree: true });
    if (!sidebarTimeTicker) {
      sidebarTimeTicker = setInterval(() => {
        decorateSidebarConversationRows();
      }, 15000);
    }
  }

  function _cleanupForUpgrade() {
    observer.disconnect();
    if (sidebarTimeTicker) {
      clearInterval(sidebarTimeTicker);
      sidebarTimeTicker = null;
    }
    if (typeof reduxStoreUnsubscribe === "function") {
      try { reduxStoreUnsubscribe(); } catch (e) {}
      reduxStoreUnsubscribe = null;
    }
    if (webEventSource) {
      try { webEventSource.close(); } catch (e) {}
      webEventSource = null;
    }
    history.pushState = origPushState;
    history.replaceState = origReplaceState;
    window.removeEventListener("popstate", checkUrlChange);
    window.removeEventListener("keydown", onKeyDownCapture, true);
    window.removeEventListener("click", onClickCapture, true);
    document.removeEventListener("mousedown", onMouseDown, true);
    closeTagPopover();
    closeFileContextMenu();
    closePiModelPopover();
    document.getElementById("agy-project-files-panel")?.remove();
    document.getElementById("agy-pi-engine-bar")?.remove();
    document.getElementById("agy-pi-turns-container")?.remove();
  }

  function uninstall() {
    _cleanupForUpgrade();
    document.getElementById("agy-project-tags-bar")?.remove();
    document.getElementById("agy-pi-turns-container")?.remove();
    document.querySelectorAll(".agy-pi-native-turn").forEach(el => el.remove());
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
  return "injected_v10_ok";
})();

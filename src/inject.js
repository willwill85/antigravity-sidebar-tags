/**
 * Antigravity Sidebar Tags - Frontend Injector (inject.js)
 *
 * Dynamically injects a tag navigation bar above the left sidebar project list,
 * adds colored tag badges & a tag assignment popover to each project card,
 * and hooks React's internal `richProjectsProvider` so filtering works natively
 * with `@tanstack/react-virtual` (zero blank gaps, hides non-matching projects
 * and their nested conversations cleanly).
 */
(() => {
  const STORAGE_KEY = "agy_project_tags_v1";
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

  // If already running, allow hot-updating config and refreshing
  if (window.__AGY_TAG_NAV_INSTANCE__) {
    if (window.__AGY_INITIAL_PROJECT_TAGS__ && !localStorage.getItem(STORAGE_KEY)) {
      window.__AGY_TAG_NAV_INSTANCE__.setConfig(window.__AGY_INITIAL_PROJECT_TAGS__);
    }
    window.__AGY_TAG_NAV_INSTANCE__.refreshAll();
    return "already_active_refreshed";
  }

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

  let state = loadInitialConfig();
  if (!state.activeTag) state.activeTag = "all";

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
      #agy-tag-popover {
        position: fixed;
        z-index: 99999;
        width: 236px;
        border-radius: 10px;
        padding: 10px;
        background: var(--popover, #ffffff);
        color: var(--popover-foreground, #111827);
        border: 1px solid rgba(128, 128, 128, 0.24);
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18), 0 2px 6px rgba(0, 0, 0, 0.08);
        font-size: 12px;
        user-select: none;
      }
      html[style*="dark"] #agy-tag-popover {
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
    `;
  }

  let cachedPmf = null;
  let cachedRpp = null;

  function findReactProviders() {
    if (cachedRpp && cachedPmf) return { pmf: cachedPmf, rpp: cachedRpp };
    const el = document.querySelector('[data-testid="conversation-list-sidebar"]');
    if (!el) return null;
    const fiberKey = Object.keys(el).find(k => k.startsWith("__reactFiber$"));
    if (!fiberKey) return null;
    let cur = el[fiberKey];
    while (cur) {
      const v = cur.memoizedProps?.value;
      if (v?.projectManagementFeature?.richProjectsProvider) {
        cachedPmf = v.projectManagementFeature;
        cachedRpp = cachedPmf.richProjectsProvider;
        break;
      }
      cur = cur.return;
    }
    if (!cachedRpp) return null;
    hookRichProjectsProvider(cachedPmf, cachedRpp);
    return { pmf: cachedPmf, rpp: cachedRpp };
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

      // Guard updateProject so synthetic archived state is never sent as unarchive RPC
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

  function getActiveProjectsList() {
    const found = findReactProviders();
    if (!found || !found.rpp._rawState) return [];
    const list = [];
    for (const [k, v] of found.rpp._rawState.entries()) {
      const orig = v._origItem || v;
      if (k === "outside-of-project" || orig.project?.archived) continue;
      list.push({ id: k, name: orig.project?.name || k });
    }
    return list;
  }

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

    // 1. "全部" pill
    const allBtn = document.createElement("button");
    allBtn.type = "button";
    allBtn.className = "agy-tag-pill" + (state.activeTag === "all" ? " active" : "");
    allBtn.style.setProperty("--agy-pill-color", "#2563eb");
    allBtn.style.setProperty("--agy-pill-bg", hexToRgba("#2563eb", 0.14));
    allBtn.innerHTML = `<span>全部</span><span class="agy-tag-count">${counts.all}</span>`;
    allBtn.onclick = () => selectTagFilter("all");
    bar.appendChild(allBtn);

    // 2. Each Tag pill
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

    // 3. "未分类" pill
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

    // 4. "+ 标签" manage button
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

      // 1. Render badges next to project title
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

      // 2. Add a hover tag icon button in the right action bar of the project card
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
  };
  document.addEventListener("mousedown", onMouseDown, true);

  function refreshAll() {
    ensureStyles();
    const found = findReactProviders();
    if (found) {
      applyTagFilterToRpp(found.rpp);
    }
    renderTagBar();
    decorateProjectCards();
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
      decorateProjectCards();
    });
  });

  function startObserver() {
    ensureStyles();
    refreshAll();
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function uninstall() {
    observer.disconnect();
    document.removeEventListener("mousedown", onMouseDown, true);
    closeTagPopover();
    document.getElementById("agy-project-tags-bar")?.remove();
    document.getElementById("agy-project-tags-style")?.remove();
    document.querySelectorAll(".agy-proj-badges, .agy-proj-tag-btn").forEach(el => el.remove());
    if (cachedRpp && cachedRpp._rawState && cachedRpp._origSetState) {
      cachedRpp._origSetState(cachedRpp._rawState);
    }
    delete window.__AGY_TAG_NAV_INSTANCE__;
  }

  window.__AGY_TAG_NAV_INSTANCE__ = {
    refreshAll,
    uninstall,
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
  return "injected_ok";
})();

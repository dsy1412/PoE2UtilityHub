(function () {
  const baseBuilds = window.TOOLMAN_BUILDS || [];
  const chronicle = window.POE2_CHRONICLE || [];
  const poe2Items = window.POE2DB_ITEMS || [];
  const poe2BaseItems = window.POE2DB_BASE_ITEMS || [];
  const pobImports = window.POB_IMPORTS || {};
  const pobTree = window.POB_TREE_0_4 || null;
  let builds = [...baseBuilds, ...loadImportedDrafts()];
  let currentLang = localStorage.getItem("toolman.lang") || "zh";
  const englishText = {
    "工具人 BD 图鉴": "Support Build Atlas",
    "先看装备需求，再看用法。概念统一沉淀成知识节点，老手可以跳过，新手可以点开查。": "Start with gear requirements, then usage. Reusable concepts are kept as knowledge nodes for quick lookup.",
    "搜索工具人": "Search builds",
    "职业、机制、装备、玩法": "Class, mechanic, gear, playstyle",
    "全部": "All",
    "组队": "Party",
    "挂机": "AFK",
    "概念节点": "Concept Nodes",
    "装备需求": "Gear Requirements",
    "这个 BD 怎么用": "How To Use",
    "装备补位": "Gear Plan",
    "天赋图模板": "Passive Template",
    "技能插槽": "Skill Links",
    "实战提醒": "Combat Notes",
    "增伤": "Damage",
    "防御": "Defense",
    "特殊": "Utility",
    "Path of Building 联动": "Path of Building Link",
    "复制导入码": "Copy Code",
    "下载导入码": "Download Code",
    "用 PoB 打开": "Open in PoB",
    "来源": "Source",
    "PoB 草稿导入": "PoB Draft Import",
    "PoB 草稿导入器": "PoB Draft Importer",
    "本地缓存源": "Local Cache Source",
    "载入": "Load",
    "poe.ninja 角色链接": "poe.ninja Character URL",
    "手动粘贴 URL / Code": "Manual URL / Code",
    "PoB 导入码": "PoB Import Code",
    "生成网站草稿": "Generate Draft",
    "导入到本地预览": "Import To Preview",
    "复制草稿 JSON": "Copy Draft JSON",
    "装备槽位": "Equipment Slots",
    "技能组": "Skill Groups",
    "天赋节点": "Passive Tree",
    "PoB 可视化导入": "PoB Visual Import",
    "0.4 真实星盘坐标": "0.4 Real Tree Coordinates",
    "查看全部节点": "Show All Nodes"
  };

  const state = {
    selectedId: builds[0] && builds[0].id,
    conceptId: "",
    query: "",
    filter: "all"
  };

  const els = {
    buildList: document.querySelector("#buildList"),
    detail: document.querySelector("#buildDetail"),
    chronicleList: document.querySelector("#chronicleList"),
    search: document.querySelector("#buildSearch"),
    chips: Array.from(document.querySelectorAll(".chip")),
    importer: document.querySelector("#pobImporter"),
    openImporter: document.querySelector("#openPobImporter"),
    closeImporter: document.querySelector("#closePobImporter"),
    importSource: document.querySelector("#pobImportSource"),
    loadImportSource: document.querySelector("#loadPobSource"),
    importUrl: document.querySelector("#pobSourceUrl"),
    importCode: document.querySelector("#pobImportCode"),
    parseImportCode: document.querySelector("#parsePobCode"),
    saveDraft: document.querySelector("#savePobDraft"),
    copyDraft: document.querySelector("#copyPobDraft"),
    importStatus: document.querySelector("#pobImportStatus"),
    importPreview: document.querySelector("#pobImportPreview"),
    draftOutput: document.querySelector("#pobDraftOutput")
  };
  els.languageToggle = document.querySelector("#languageToggle");

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function loadImportedDrafts() {
    try {
      const parsed = JSON.parse(localStorage.getItem("toolman.importedBuilds") || "[]");
      return Array.isArray(parsed) ? parsed.map(normalizeImportedBuild) : [];
    } catch (_error) {
      return [];
    }
  }

  function storeImportedDraft(build) {
    build = normalizeImportedBuild(build);
    const drafts = loadImportedDrafts().filter((item) => item.id !== build.id);
    drafts.unshift(build);
    localStorage.setItem("toolman.importedBuilds", JSON.stringify(drafts.slice(0, 20)));
    builds = [...baseBuilds, ...drafts.slice(0, 20)];
  }

  function normalizeImportedBuild(build) {
    if (!build || !build.importMeta) return build;
    const meta = build.importMeta;
    const character = meta.character || extractCharacterName(meta.sourceUrl) || build.shortTitle || "Imported Character";
    const equipment = (meta.equipment || []).map((entry) => ({
      ...entry,
      icon: iconForImportedItem(entry.name, entry.base, entry.slot)
    }));
    return {
      ...build,
      importMeta: {
        ...meta,
        equipment,
        uniques: equipment.filter((entry) => entry.rarity === "UNIQUE")
      },
      title: `0.4 ${character}`,
      shortTitle: character,
      season: build.season || "0.4",
      mode: build.mode && !/待归类|PoB/.test(build.mode) ? build.mode : "待归类",
      cost: build.cost && !/待定/.test(build.cost) ? build.cost : "待定造价",
      status: "角色导入模板，需人工整理",
      tagline: `从 poe.ninja / ${character} 导入的工具人角色模板，请按实际 BD 修改定位、队伍收益和实战说明。`,
      quickUse: [
        "补充这个工具人的核心职责：增伤、承伤、喂球、药剂回复、诅咒或其他队伍收益。",
        "把 PoB 自动导入的装备筛成真正绑定项，其余放到装备补位。",
        "补充实战循环、范围要求、队友配合和版本风险。"
      ],
      templateType: "poe-ninja-character",
      templateVersion: 1
    };
  }

  function applyLanguage() {
    const isEnglish = currentLang === "en";
    document.documentElement.lang = isEnglish ? "en" : "zh-CN";
    document.body.dataset.lang = currentLang;
    document.title = isEnglish ? "POE2 Support Build Atlas" : "POE2 工具人 BD 图鉴";
    if (els.languageToggle) els.languageToggle.textContent = isEnglish ? "中" : "EN";

    const staticCopy = isEnglish
      ? {
          h1: "Support Build Atlas",
          lead: "Start with gear requirements, then usage. Concepts are reusable knowledge nodes for fast lookup.",
          search: "Search builds",
          placeholder: "Class, mechanic, gear, playstyle"
        }
      : {
          h1: "工具人 BD 图鉴",
          lead: "先看装备需求，再看用法。概念统一沉淀成知识节点，老手可以跳过，新手可以点开查。",
          search: "搜索工具人",
          placeholder: "职业、机制、装备、玩法"
        };
    const h1 = document.querySelector(".header-copy h1");
    const lead = document.querySelector(".lead");
    const searchLabel = document.querySelector(".search-box label");
    if (h1) h1.textContent = staticCopy.h1;
    if (lead) lead.textContent = staticCopy.lead;
    if (searchLabel) searchLabel.textContent = staticCopy.search;
    if (els.search) els.search.placeholder = staticCopy.placeholder;
    if (els.importUrl) {
      els.importUrl.placeholder = isEnglish
        ? "https://poe.ninja/poe2/profile/.../character/... (optional)"
        : "https://poe.ninja/poe2/profile/.../character/...（可选）";
    }
    if (els.importCode) {
      els.importCode.placeholder = isEnglish
        ? "Paste an eNrt... code, or paste a poe.ninja URL + eNrt... together."
        : "粘贴 eNrt... 导入码，也可以直接粘贴 poe.ninja 链接 + eNrt...";
    }

    if (isEnglish) translateTextNodes(document.body);
  }

  function translateTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const text = node.nodeValue.trim();
      if (englishText[text]) {
        node.nodeValue = node.nodeValue.replace(text, englishText[text]);
      }
    }
  }

  function rerender() {
    renderBuildCatalog();
    renderDetail();
    renderChronicle();
    applyLanguage();
  }

  function buildText(build) {
    return [
      build.title,
      build.shortTitle,
      build.className,
      build.ascendancy,
      build.mode,
      build.status,
      build.tagline,
      ...(build.conceptIds || [])
    ].join(" ").toLowerCase();
  }

  function selectedBuild() {
    return builds.find((build) => build.id === state.selectedId) || builds[0];
  }

  function conceptById(id) {
    return chronicle.find((entry) => entry.id === id);
  }

  function itemById(id) {
    return poe2Items.find((item) => item.id === id);
  }

  function normalizeName(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "");
  }

  function itemByName(name) {
    const key = normalizeName(name);
    if (!key) return null;
    return poe2Items.find((item) => normalizeName(item.name) === key || normalizeName(item.cnName) === key) || null;
  }

  function baseItemByName(name) {
    const key = normalizeName(name);
    if (!key) return null;
    return poe2BaseItems.find((item) => (
      normalizeName(item.name) === key ||
      normalizeName(item.cnName) === key ||
      normalizeName(item.slug) === key
    )) || null;
  }

  function itemIconForName(name) {
    const dbItem = itemByName(name);
    return dbItem?.localIcon || dbItem?.icon || "";
  }

  function baseIconForName(name) {
    const dbItem = baseItemByName(name);
    return dbItem?.localIcon || dbItem?.icon || "";
  }

  function iconForImportedItem(name, base, slot) {
    return itemIconForName(name) || baseIconForName(base) || baseIconForName(name) || fallbackItemIcon(slot, base || name);
  }

  function itemDbIdForName(name) {
    return itemByName(name)?.id || "";
  }

  function extractCharacterName(url) {
    const match = String(url || "").match(/\/character\/([^/?#]+)/i);
    return match ? decodeURIComponent(match[1]) : "";
  }

  function fallbackItemIcon(slot = "", base = "") {
    const text = `${slot} ${base}`.toLowerCase();
    if (/flask|药剂|life flask|mana flask/.test(text)) return "./assets/icons/icon_flask.svg";
    if (/glove|gauntlet|mitt|handwrap|手套/.test(text)) return "./assets/icons/icon_gloves.svg";
    if (/boot|shoe|sandal|鞋/.test(text)) return "./assets/icons/icon_boots.png";
    if (/helmet|helm|cap|mask|hood|tiara|头/.test(text)) return "./assets/icons/icon_helmet.png";
    if (/body|armour|armor|robe|cuirass|jacket|coat|衣/.test(text)) return "./assets/icons/icon_body_armour.png";
    if (/belt|腰/.test(text)) return "./assets/icons/icon_belt.png";
    if (/amulet|talisman|项链/.test(text)) return "./assets/icons/icon_amulet.png";
    if (/ring|戒指/.test(text)) return "./assets/icons/icon_ring_left.png";
    if (/shield|buckler|focus|法器|盾/.test(text)) return "./assets/icons/icon_shield.png";
    return "./assets/icons/icon_weapon.png";
  }

  function pobImportForBuild(build) {
    return build.pobImportId ? pobImports[build.pobImportId] : null;
  }

  function makeDownloadHref(code) {
    return `data:text/plain;charset=utf-8,${encodeURIComponent(code)}`;
  }

  function cleanMod(value) {
    return String(value || "").replace(/\[([^\]|]+)\|([^\]]+)\]/g, "$2").replace(/\[([^\]]+)\]/g, "$1");
  }

  function renderConceptText(text) {
    return escapeHtml(text).replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, (_match, id, label) => {
      return `<button class="text-link" type="button" data-concept-id="${escapeHtml(id)}">${escapeHtml(label)}</button>`;
    });
  }

  function filteredBuilds() {
    const query = state.query.trim().toLowerCase();
    return builds.filter((build) => {
      const matchesQuery = !query || buildText(build).includes(query);
      const matchesFilter = state.filter === "all" || build.mode.includes(state.filter) || build.status.includes(state.filter);
      return matchesQuery && matchesFilter;
    });
  }

  function renderScore(label, value) {
    const score = Math.max(0, Math.min(5, Number(value) || 0));
    const scoreText = Number.isInteger(score) ? String(score) : score.toFixed(1).replace(/\.0$/, "");
    const stars = Array.from({ length: 5 }, (_item, index) => {
      const starValue = index + 1;
      const className = score >= starValue ? "is-full" : score >= starValue - 0.5 ? "is-half" : "";
      return `<span class="${className}" aria-hidden="true">★</span>`;
    }).join("");
    return `
      <div class="star-score">
        <span>${escapeHtml(label)}</span>
        <b>${scoreText}/5</b>
        <i class="stars" aria-label="${escapeHtml(label)} ${scoreText}/5">${stars}</i>
      </div>
    `;
  }

  function renderBuildCatalog() {
    const list = filteredBuilds();
    els.buildList.innerHTML = list.length ? list.map((build) => {
      const coreItems = (build.requiredItems || []).map((item) => {
        const dbItem = item.dbId ? itemById(item.dbId) : null;
        const icon = dbItem?.localIcon || dbItem?.icon || item.icon || fallbackItemIcon(item.slot, item.label) || build.portrait;
        return `<img src="${escapeHtml(icon)}" alt="" title="${escapeHtml(dbItem?.cnName || item.label || item.slot)}">`;
      }).join("");
      return `
        <button class="tool-card ${build.id === state.selectedId ? "is-active" : ""}" type="button" data-build-id="${escapeHtml(build.id)}">
          <span class="tool-card-top">
            <img class="tool-portrait" src="${escapeHtml(build.portrait)}" alt="">
            <span>
              <strong>${escapeHtml(build.shortTitle || build.title)}</strong>
              <em>${escapeHtml(build.season)} · ${escapeHtml(build.ascendancy)} · ${escapeHtml(build.cost)}造价</em>
            </span>
          </span>
          <span class="tool-card-line">${escapeHtml(build.tagline)}</span>
          <span class="mini-icons">${coreItems}</span>
        </button>
      `;
    }).join("") : `<div class="empty-state">没有匹配的工具人。</div>`;
  }

  function renderRequiredItem(item) {
    const dbItem = item.dbId ? itemById(item.dbId) : null;
    const name = dbItem?.cnName || item.label || item.slot;
    const icon = dbItem?.localIcon || dbItem?.icon || item.icon || fallbackItemIcon(item.slot, item.label);
    const mods = [...(dbItem?.implicitMods || []), ...(dbItem?.explicitMods || [])].slice(0, 6);
    return `
      <article class="requirement">
        <div class="requirement-head">
          <img src="${escapeHtml(icon)}" alt="">
          <span>
            <small>${escapeHtml(item.slot)}</small>
            <strong>${escapeHtml(name)}</strong>
          </span>
        </div>
        <p>${escapeHtml(item.reason)}</p>
        ${mods.length ? `<ul>${mods.map((mod) => `<li>${escapeHtml(cleanMod(mod))}</li>`).join("")}</ul>` : ""}
        ${dbItem ? `<a class="source-link" href="${escapeHtml(dbItem.sourceUrl)}">PoE2DB</a>` : ""}
      </article>
    `;
  }

  function renderPassiveTemplate(passive) {
    if (passive.image) {
      return `
        <figure class="passive-shot">
          <img src="${escapeHtml(passive.image)}" alt="${escapeHtml(passive.title)}">
          <figcaption>${escapeHtml(passive.title)}</figcaption>
        </figure>
      `;
    }
    return `
      <div class="passive-placeholder">
        <strong>${escapeHtml(passive.title)}</strong>
        <span>等待补图</span>
        <p>${escapeHtml(passive.note)}</p>
      </div>
    `;
  }

  function renderPobPanel(build) {
    const pob = pobImportForBuild(build);
    if (!pob) return "";

    return `
      <section class="section-block pob-block">
        <div class="section-title">
          <span>PoB</span>
          <h3>Path of Building 联动</h3>
        </div>
        <div class="pob-actions">
          <button class="action-button" type="button" data-copy-pob="${escapeHtml(build.pobImportId)}">复制导入码</button>
          <a class="action-button" href="${escapeHtml(makeDownloadHref(pob.code))}" download="${escapeHtml(build.id)}.pob.txt">下载导入码</a>
          ${pob.protocolUrl ? `<a class="action-button" href="${escapeHtml(pob.protocolUrl)}">用 PoB 打开</a>` : ""}
          <a class="action-button ghost" href="${escapeHtml(pob.sourceUrl)}">来源</a>
        </div>
        <p class="pob-help">PoB 内按 Ctrl+I，选择从代码导入，然后粘贴。若系统已注册 pob2 协议，可以直接点“用 PoB 打开”。</p>
        <code class="pob-code">${escapeHtml(pob.code.slice(0, 180))}...</code>
      </section>
    `;
  }

  function renderImportedVisuals(build) {
    const meta = build.importMeta;
    if (!meta) return "";
    const equipment = meta.equipment || [];
    const uniques = meta.uniques || [];
    const skills = meta.skillGroups || [];
    const passiveNodes = meta.passiveNodes || [];

    return `
      <section class="section-block import-visual-block">
        <div class="section-title">
          <span>VIS</span>
          <h3>PoB 可视化导入</h3>
        </div>
        <div class="import-stats">
          <span>${escapeHtml(meta.className || build.className)} / ${escapeHtml(meta.ascendancy || build.ascendancy)}</span>
          <span>装备 ${equipment.length} 件</span>
          <span>暗金 ${uniques.length} 件</span>
          <span>技能组 ${skills.length} 组</span>
          <span>天赋节点 ${meta.nodeCount || passiveNodes.length} 个</span>
        </div>
        ${renderEquipmentBoard(equipment)}
        ${renderSkillGroups(skills)}
        ${renderPassiveNodeCloud(passiveNodes, meta.nodeCount)}
      </section>
    `;
  }

  function renderEquipmentBoard(equipment) {
    if (!equipment?.length) return "";
    return `
      <div class="visual-subsection">
        <h4>装备槽位</h4>
        <div class="equipment-board">
          ${equipment.map((entry) => `
            <article class="equip-card ${entry.rarity === "UNIQUE" ? "is-unique" : ""}">
              <div class="equip-icon"><img src="${escapeHtml(entry.icon || fallbackItemIcon(entry.slot, entry.base))}" alt=""></div>
              <div class="equip-copy">
                <small>${escapeHtml(entry.slotLabel || entry.slot)}</small>
                <strong>${escapeHtml(entry.name)}</strong>
                <em>${escapeHtml(entry.base || entry.rarity || "")}</em>
                ${entry.mods?.length ? `<ul>${entry.mods.slice(0, 4).map((mod) => `<li>${escapeHtml(cleanMod(mod))}</li>`).join("")}</ul>` : ""}
              </div>
            </article>
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderSkillGroups(skillGroups) {
    if (!skillGroups?.length) return "";
    return `
      <div class="visual-subsection">
        <h4>技能组</h4>
        <div class="skill-board">
          ${skillGroups.map((group) => `
            <article class="skill-card">
              <strong>${escapeHtml(group.main || group.gems?.[0] || "Skill")}</strong>
              <div>${(group.gems || []).map((gem, index) => `<span class="gem-pill ${index === 0 ? "is-main" : ""}">${escapeHtml(gem)}</span>`).join("")}</div>
            </article>
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderPassiveNodeCloud(passiveNodes, nodeCount) {
    if (!passiveNodes?.length && !nodeCount) return "";
    const treeMap = renderPassiveTreeMap(passiveNodes);
    return `
      <div class="visual-subsection">
        <h4>天赋节点</h4>
        ${treeMap || `
          <div class="passive-node-summary">
            <strong>${escapeHtml(nodeCount || passiveNodes.length)} 个节点</strong>
            <span>未加载 PoB TreeData，暂时按 node id 展示。</span>
          </div>
          <div class="node-cloud">
            ${passiveNodes.slice(0, 160).map((node) => `<span>${escapeHtml(node)}</span>`).join("")}
          </div>
        `}
      </div>
    `;
  }

  function renderPassiveTreeMap(passiveNodes) {
    if (!pobTree || !passiveNodes?.length) return "";
    const allocated = new Set(passiveNodes.map(String));
    const allocatedNodes = passiveNodes
      .map((id) => pobTree.nodes[String(id)])
      .filter(Boolean);
    if (!allocatedNodes.length) return "";

    const xs = allocatedNodes.map((node) => node.x);
    const ys = allocatedNodes.map((node) => node.y);
    const padding = 1150;
    const minX = Math.min(...xs) - padding;
    const maxX = Math.max(...xs) + padding;
    const minY = Math.min(...ys) - padding;
    const maxY = Math.max(...ys) + padding;
    const width = Math.max(1, maxX - minX);
    const height = Math.max(1, maxY - minY);
    const visibleNodes = Object.values(pobTree.nodes).filter((node) => (
      node.x >= minX && node.x <= maxX && node.y >= minY && node.y <= maxY && node.type !== "OnlyImage"
    ));
    const visibleSet = new Set(visibleNodes.map((node) => String(node.id)));
    const connectors = collectVisibleConnectors(visibleNodes, visibleSet);
    const activeConnectors = connectors.filter((connector) => allocated.has(String(connector.a.id)) && allocated.has(String(connector.b.id)));
    const missingIds = passiveNodes.filter((id) => !pobTree.nodes[String(id)]);

    return `
      <div class="passive-tree-map">
        <div class="passive-map-toolbar">
          <strong>0.4 真实星盘坐标</strong>
          <span>${allocatedNodes.length}/${passiveNodes.length} 个节点命中，${activeConnectors.length} 条已点连接，显示 ${visibleNodes.length} 个周边节点</span>
        </div>
        <svg viewBox="${minX} ${minY} ${width} ${height}" role="img" aria-label="PoB passive tree map">
          <rect x="${minX}" y="${minY}" width="${width}" height="${height}" class="tree-bg"></rect>
          <g class="tree-grid">
            ${visibleNodes.map((node) => renderOrbitGuide(node)).join("")}
          </g>
          <g class="tree-links tree-links-muted">
            ${connectors.map((connector) => renderTreeConnector(connector, false)).join("")}
          </g>
          <g class="tree-links tree-links-active">
            ${activeConnectors.map((connector) => renderTreeConnector(connector, true)).join("")}
          </g>
          <g class="tree-nodes">
            ${visibleNodes.map((node) => renderTreeNode(node, allocated.has(String(node.id)))).join("")}
          </g>
        </svg>
        ${missingIds.length ? `<p class="tree-missing">未绘制特殊节点：${missingIds.map(escapeHtml).join(", ")}</p>` : ""}
      </div>
    `;
  }

  function collectVisibleConnectors(visibleNodes, visibleSet) {
    const connectors = [];
    const seen = new Set();
    for (const node of visibleNodes) {
      for (const connection of node.connections || []) {
        const otherId = typeof connection === "object" ? connection.id : connection;
        if (!visibleSet.has(String(otherId))) continue;
        const other = pobTree.nodes[String(otherId)];
        if (!other || !shouldDrawTreeConnection(node, other)) continue;
        const key = [node.id, other.id].sort((a, b) => a - b).join("-");
        if (seen.has(key)) continue;
        seen.add(key);
        connectors.push({ a: node, b: other, connection: typeof connection === "object" ? connection : { id: otherId, orbit: 0 } });
      }
    }
    return connectors;
  }

  function shouldDrawTreeConnection(a, b) {
    if (a.id === b.id) return false;
    if (a.type === "OnlyImage" || b.type === "OnlyImage") return false;
    if ((a.ascendancyName || "") !== (b.ascendancyName || "")) return false;
    if (a.type === "ClassStart" || b.type === "ClassStart") return false;
    return true;
  }

  function renderTreeConnector({ a, b, connection }, active) {
    const d = treeConnectorPath(a, b, connection);
    return `<path d="${escapeHtml(d)}"${active ? "" : " aria-hidden=\"true\""}></path>`;
  }

  function treeConnectorPath(a, b, connection) {
    const orbit = Math.abs(Number(connection?.orbit || 0));
    const orbitRadius = pobTree.orbitRadii?.[orbit];
    if (orbit && orbitRadius) {
      const sweep = Number(connection.orbit) > 0 ? 1 : 0;
      return arcPath(a, b, orbitRadius, sweep);
    }
    if (a.group === b.group && a.orbit === b.orbit && pobTree.orbitRadii?.[a.orbit]) {
      return arcPath(a, b, pobTree.orbitRadii[a.orbit], 1);
    }
    return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
  }

  function arcPath(a, b, radius, sweep) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (!dist || dist > radius * 2.25) return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
    const largeArc = dist > radius * 1.35 ? 1 : 0;
    return `M ${a.x} ${a.y} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${b.x} ${b.y}`;
  }

  function renderOrbitGuide(node) {
    if (!node.group || node.orbit <= 0) return "";
    const group = pobTree.groups?.[String(node.group)];
    const radius = pobTree.orbitRadii?.[node.orbit];
    if (!group || !radius) return "";
    return `<circle cx="${group.x}" cy="${group.y}" r="${radius}"></circle>`;
  }

  function renderTreeNode(node, allocated) {
    const radius = nodeRadius(node.type);
    const label = [node.name, ...(node.stats || [])].filter(Boolean).join("\n");
    return `
      <g class="tree-node ${allocated ? "is-allocated" : "is-unallocated"} tree-node-${escapeHtml(node.type)}" transform="translate(${node.x} ${node.y})">
        <circle r="${radius}"></circle>
        <title>${escapeHtml(label || String(node.id))}</title>
      </g>
    `;
  }

  function nodeRadius(type) {
    if (type === "Keystone") return 70;
    if (type === "Notable") return 52;
    if (type === "Socket") return 46;
    if (type === "Ascendancy" || type === "AscendancyStart") return 46;
    if (type === "ClassStart") return 56;
    if (type === "Attribute") return 34;
    return 28;
  }

  function renderConceptChips(build) {
    return (build.conceptIds || []).map((id) => {
      const concept = conceptById(id);
      if (!concept) return "";
      return `<button class="concept-chip" type="button" data-concept-id="${escapeHtml(id)}">${escapeHtml(concept.name)}</button>`;
    }).join("");
  }

  function renderDetail() {
    const build = selectedBuild();
    if (!build) {
      els.detail.innerHTML = `<div class="empty-state">还没有工具人数据。</div>`;
      return;
    }

    els.detail.innerHTML = `
      <article class="build-page">
        <header class="build-head">
          <div>
            <p class="eyebrow">${escapeHtml(build.season)} · ${escapeHtml(build.mode)} · ${escapeHtml(build.status)}</p>
            <h2>${escapeHtml(build.title)}</h2>
            <p>${escapeHtml(build.tagline)}</p>
          </div>
          <div class="score-box">
            ${renderScore("增伤", build.ratings.offense)}
            ${renderScore("防御", build.ratings.defense)}
            ${renderScore("特殊", build.ratings.special)}
          </div>
        </header>

        <section class="primary-grid">
          <div class="section-block">
            <div class="section-title">
              <span>01</span>
              <h3>装备需求</h3>
            </div>
            <div class="requirements-grid">${build.requiredItems.map(renderRequiredItem).join("")}</div>
          </div>

          <div class="section-block">
            <div class="section-title">
              <span>02</span>
              <h3>这个 BD 怎么用</h3>
            </div>
            <ol class="use-list">${build.quickUse.map((line) => `<li>${renderConceptText(line)}</li>`).join("")}</ol>
          </div>
        </section>

        ${renderPobPanel(build)}
        ${renderImportedVisuals(build)}

        <section class="section-block">
          <div class="section-title">
            <span>03</span>
            <h3>装备补位</h3>
          </div>
          <ul class="dense-list">${build.gearPlan.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>
        </section>

        <section class="secondary-grid">
          <div class="section-block">
            <div class="section-title">
              <span>04</span>
              <h3>天赋图模板</h3>
            </div>
            <div class="passive-grid">${build.passives.map(renderPassiveTemplate).join("")}</div>
          </div>
          <div class="section-block">
            <div class="section-title">
              <span>05</span>
              <h3>技能插槽</h3>
            </div>
            <ul class="dense-list">${build.skills.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>
          </div>
        </section>

        <section class="section-block warning-block">
          <div class="section-title">
            <span>!</span>
            <h3>实战提醒</h3>
          </div>
          <ul class="dense-list">${build.warnings.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>
        </section>

        <section class="section-block">
          <div class="section-title">
            <span>#</span>
            <h3>概念节点</h3>
          </div>
          <div class="concept-row">${renderConceptChips(build)}</div>
        </section>
      </article>
    `;
  }

  function renderChronicle() {
    const active = state.conceptId ? conceptById(state.conceptId) : null;
    const entries = active ? [active, ...active.related.map(conceptById).filter(Boolean)] : chronicle;
    els.chronicleList.innerHTML = `
      ${active ? `<button class="reset-concept" type="button" data-reset-concept="1">查看全部节点</button>` : ""}
      <div class="node-map">
        ${entries.map((entry) => `
          <article class="node-card ${entry.id === state.conceptId ? "is-active" : ""}">
            <button type="button" data-concept-id="${escapeHtml(entry.id)}">
              <small>${escapeHtml(entry.group)}</small>
              <strong>${escapeHtml(entry.name)}</strong>
            </button>
            <p>${escapeHtml(entry.summary)}</p>
            ${entry.sourceUrl ? `<a class="source-link" href="${escapeHtml(entry.sourceUrl)}">${escapeHtml(entry.source)}</a>` : `<span class="source-muted">${escapeHtml(entry.source)}</span>`}
          </article>
        `).join("")}
      </div>
    `;
  }

  function renderImportSources() {
    if (!els.importSource) return;
    const entries = Object.entries(pobImports);
    els.importSource.innerHTML = entries.length
      ? `<option value="">手动粘贴 URL / Code</option>${entries.map(([id, pob]) => `<option value="${escapeHtml(id)}">${escapeHtml(pob.label || id)}</option>`).join("")}`
      : `<option value="">暂无本地缓存源</option>`;
  }

  function setImportStatus(message, type = "") {
    if (!els.importStatus) return;
    els.importStatus.textContent = message;
    els.importStatus.dataset.type = type;
  }

  function parsePoeNinjaUrl(url) {
    const cleanUrl = String(url || "").trim().replace(/[，,。]+$/g, "");
    const match = cleanUrl.match(/^https?:\/\/poe\.ninja\/poe2\/profile\/([^/]+)\/([^/]+)\/character\/([^/?#]+)/i);
    if (!match) return null;
    const [, account, league, character] = match;
    return {
      sourceUrl: cleanUrl,
      rawUrl: `https://poe.ninja/poe2/pob/raw/profile/code/${account}/${league}/${character}`,
      protocolUrl: `pob2://poeninja/profile/code/${account}/${league}/${character}`,
      label: `poe.ninja / ${decodeURIComponent(character)}`,
      character: decodeURIComponent(character),
      account: decodeURIComponent(account),
      league: decodeURIComponent(league)
    };
  }

  function extractPobImportPayload(rawText, sourceUrlText = "") {
    const text = String(rawText || "").trim();
    const inlineUrl = text.match(/https?:\/\/poe\.ninja\/poe2\/profile\/[^\s,，]+/i)?.[0] || "";
    const sourceUrl = String(sourceUrlText || inlineUrl || "").trim().replace(/[，,。]+$/g, "");
    let codeText = text;
    if (inlineUrl) codeText = codeText.replace(inlineUrl, " ");
    if (sourceUrl && codeText.includes(sourceUrl)) codeText = codeText.replace(sourceUrl, " ");
    const candidates = codeText
      .split(/[\s,，]+/)
      .map((part) => part.trim().replace(/^["'“”‘’]+|["'“”‘’]+$/g, ""))
      .filter((part) => /^[A-Za-z0-9_-]{80,}={0,2}$/.test(part));
    const code = candidates.find((part) => part.startsWith("eN")) || candidates[0] || codeText.trim();
    return {
      code,
      source: parsePoeNinjaUrl(sourceUrl) || (sourceUrl ? { sourceUrl, label: sourceUrl } : null)
    };
  }

  async function decodePobCode(code) {
    const cleaned = String(code || "").trim().replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
    if (!cleaned) throw new Error("请先粘贴 PoB 导入码。");
    const padded = cleaned + "=".repeat((4 - cleaned.length % 4) % 4);
    const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));

    if (!("DecompressionStream" in window)) {
      throw new Error("当前浏览器不支持本地解压 PoB code，请用 Chromium/Chrome 打开。");
    }

    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
    return new Response(stream).text();
  }

  function parseItemText(rawText) {
    const lines = String(rawText || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const rarityLine = lines.find((line) => line.startsWith("Rarity:")) || "";
    const rarity = rarityLine.replace("Rarity:", "").trim();
    const rarityIndex = lines.indexOf(rarityLine);
    const name = lines[rarityIndex + 1] || "Unknown Item";
    const base = lines[rarityIndex + 2] || "";
    const ignored = /^(Unique ID:|Item Level:|LevelReq:|Implicits:|Sockets:|Quality:|Evasion:|Energy Shield:|Armour:|Block chance:|Charm Slots:|Requires |Has |Corrupted$)/i;
    const mods = lines
      .slice(Math.max(0, rarityIndex + 3))
      .filter((line) => !ignored.test(line))
      .filter((line) => !/^\d+%?$/.test(line))
      .slice(0, 8);
    return { rarity, name, base, mods };
  }

  function slotLabel(slotName) {
    const names = {
      "Body Armour": "衣服",
      "Weapon 1": "主手",
      "Weapon 2": "副手",
      "Weapon 1 Swap": "副手武器组主手",
      "Weapon 2 Swap": "副手武器组副手",
      Helmet: "头盔",
      Gloves: "手套",
      Boots: "鞋子",
      Belt: "腰带",
      Amulet: "项链",
      "Ring 1": "戒指 1",
      "Ring 2": "戒指 2",
      "Flask 1": "药剂 1",
      "Flask 2": "药剂 2"
    };
    return names[slotName] || slotName || "装备";
  }

  function buildDraftId(text) {
    return `imported-${String(text || "pob-build")
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "pob-build"}`;
  }

  function summarizePobXml(xmlText, sourceId, directSource = null) {
    const doc = new DOMParser().parseFromString(xmlText, "application/xml");
    const parseError = doc.querySelector("parsererror");
    if (parseError || !doc.querySelector("PathOfBuilding2")) {
      throw new Error("PoB XML 解析失败。");
    }

    const cachedSourceId = directSource ? "" : sourceId;
    const source = directSource || (cachedSourceId ? pobImports[cachedSourceId] : null);
    const buildNode = doc.querySelector("Build");
    const specNode = doc.querySelector("Tree Spec");
    const itemNodes = Array.from(doc.querySelectorAll("Items > Item"));
    const itemMap = new Map(itemNodes.map((item) => [item.getAttribute("id"), parseItemText(item.textContent)]));
    const slots = Array.from(doc.querySelectorAll("ItemSet Slot"))
      .map((slot) => ({
        name: slot.getAttribute("name"),
        itemId: slot.getAttribute("itemId"),
        item: itemMap.get(slot.getAttribute("itemId"))
      }))
      .filter((slot) => slot.item && slot.itemId !== "0");
    const visualEquipment = slots.map((slot) => {
      const dbItem = itemByName(slot.item.name);
      return {
        slot: slot.name,
        slotLabel: slotLabel(slot.name),
        itemId: slot.itemId,
        name: slot.item.name,
        base: slot.item.base,
        rarity: slot.item.rarity.toUpperCase(),
        mods: slot.item.mods,
        dbId: dbItem?.id || "",
        icon: dbItem?.localIcon || dbItem?.icon || iconForImportedItem(slot.item.name, slot.item.base, slot.name)
      };
    });
    const uniqueSlots = slots.filter((slot) => slot.item.rarity.toUpperCase() === "UNIQUE");
    const skillGroups = Array.from(doc.querySelectorAll("SkillSet > Skill"))
      .map((skill) => Array.from(skill.querySelectorAll("Gem"))
        .filter((gem) => gem.getAttribute("enabled") !== "false")
        .map((gem) => gem.getAttribute("nameSpec") || gem.getAttribute("skillId") || "Unknown Gem"))
      .filter((gems) => gems.length);
    const skillLines = skillGroups.map((gems) => gems.join(" - "));
    const visualSkills = skillGroups.map((gems, index) => ({
      id: `skill-${index + 1}`,
      main: gems[0],
      gems
    }));
    const passiveNodes = (specNode?.getAttribute("nodes") || "").split(",").filter(Boolean);
    const nodeCount = passiveNodes.length;
    const className = buildNode?.getAttribute("className") || "待确认";
    const ascendancy = buildNode?.getAttribute("ascendClassName") || "待确认";
    const sourceLabel = source?.label || "PoB 导入";
    const characterName = source?.character || extractCharacterName(source?.sourceUrl) || source?.label?.split("/").pop()?.trim() || `${ascendancy} ${className}`;
    const titleBase = characterName;

    const draft = {
      id: buildDraftId(titleBase),
      pobImportId: cachedSourceId || "",
      title: `0.4 ${titleBase}`,
      shortTitle: titleBase,
      season: "0.4",
      className,
      ascendancy,
      cost: "待定",
      mode: "待归类",
      portrait: "./assets/gemling-legionnaire.webp",
      status: "角色导入模板，需人工整理",
      tagline: `从 poe.ninja / ${characterName} 导入的工具人角色模板，请按实际 BD 修改定位、队伍收益和实战说明。`,
      templateType: "poe-ninja-character",
      templateVersion: 1,
      conceptIds: [],
      ratings: {
        offense: 3,
        defense: 3,
        special: 3
      },
      quickUse: [
        "补充这个工具人的核心职责：增伤、承伤、喂球、药剂回复、诅咒或其他队伍收益。",
        "把 PoB 自动导入的装备筛成真正绑定项，其余放到装备补位。",
        "补充实战循环、范围要求、队友配合和版本风险。"
      ],
      requiredItems: uniqueSlots.slice(0, 6).map((slot) => ({
        slot: slotLabel(slot.name),
        dbId: itemDbIdForName(slot.item.name),
        icon: iconForImportedItem(slot.item.name, slot.item.base, slot.name),
        label: slot.item.name,
        reason: `PoB 导入的暗金装备：${slot.item.base || "未知底子"}。请确认是否为 BD 绑定项。`
      })),
      gearPlan: slots.map((slot) => `${slotLabel(slot.name)}：${slot.item.name}${slot.item.base ? `（${slot.item.base}）` : ""}`),
      passives: [
        {
          title: "PoB 导入天赋",
          image: "",
          note: `职业 ${className} / 升华 ${ascendancy}，当前导入 ${nodeCount} 个天赋节点。后续可补天赋截图。`
        }
      ],
      skills: skillLines.slice(0, 12),
      importMeta: {
        sourceLabel,
        sourceUrl: source?.sourceUrl || "",
        character: characterName,
        className,
        ascendancy,
        equipment: visualEquipment,
        uniques: visualEquipment.filter((entry) => entry.rarity === "UNIQUE"),
        skillGroups: visualSkills,
        passiveNodes,
        nodeCount
      },
      warnings: [
        "这是自动草稿，只能保证 PoB 结构已读取；BD 功能、优先级和版本解释需要人工复核。",
        "自动识别会优先把暗金装备放进绑定项，但部分暗金可能只是临时配装。"
      ]
    };

    return {
      draft,
      summary: {
        className,
        ascendancy,
        slots: slots.length,
        uniques: uniqueSlots.length,
        skills: skillGroups.length,
        nodeCount
      }
    };
  }

  async function parseImporterDraft() {
    try {
      setImportStatus("正在解压并解析 PoB code...");
      const sourceId = els.importSource?.value || "";
      const payload = extractPobImportPayload(els.importCode.value, els.importUrl?.value);
      const xmlText = await decodePobCode(payload.code);
      const result = summarizePobXml(xmlText, sourceId, payload.source);
      if (els.importUrl && payload.source?.sourceUrl) els.importUrl.value = payload.source.sourceUrl;
      if (els.importCode && payload.code !== els.importCode.value.trim()) els.importCode.value = payload.code;
      els.draftOutput.value = JSON.stringify(result.draft, null, 2);
      els.importPreview.innerHTML = `
        <strong>${escapeHtml(result.draft.title)}</strong>
        <span>${escapeHtml(result.summary.className)} / ${escapeHtml(result.summary.ascendancy)}</span>
        <span>装备 ${result.summary.slots} 件，暗金 ${result.summary.uniques} 件，技能组 ${result.summary.skills} 组，天赋节点 ${result.summary.nodeCount} 个</span>
      `;
      setImportStatus("已生成网站草稿。复制 JSON 后可以放进 data/builds.js，再补正文。", "success");
    } catch (error) {
      setImportStatus(error.message || "导入失败。", "error");
    }
  }

  function renderImporterVisualPreview(result) {
    const meta = result.draft.importMeta;
    return `
      <div class="draft-hero">
        <strong>${escapeHtml(result.draft.title)}</strong>
        <span>${escapeHtml(result.summary.className)} / ${escapeHtml(result.summary.ascendancy)}</span>
        <span>装备 ${result.summary.slots} 件，暗金 ${result.summary.uniques} 件，技能组 ${result.summary.skills} 组，天赋节点 ${result.summary.nodeCount} 个</span>
      </div>
      ${renderEquipmentBoard(meta.equipment)}
      ${renderSkillGroups(meta.skillGroups)}
      ${renderPassiveNodeCloud(meta.passiveNodes, meta.nodeCount)}
    `;
  }

  function refreshImporterVisualPreview() {
    try {
      const draft = JSON.parse(els.draftOutput.value || "{}");
      if (!draft.importMeta) return;
      els.importPreview.innerHTML = renderImporterVisualPreview({
        draft,
        summary: {
          className: draft.importMeta.className || draft.className,
          ascendancy: draft.importMeta.ascendancy || draft.ascendancy,
          slots: draft.importMeta.equipment?.length || 0,
          uniques: draft.importMeta.uniques?.length || 0,
          skills: draft.importMeta.skillGroups?.length || 0,
          nodeCount: draft.importMeta.nodeCount || draft.importMeta.passiveNodes?.length || 0
        }
      });
    } catch (_error) {
      // The text area may be empty while the user is still working.
    }
  }

  function bindEvents() {
    renderImportSources();

    els.openImporter?.addEventListener("click", () => {
      els.importer.hidden = false;
      applyLanguage();
    });

    els.closeImporter?.addEventListener("click", () => {
      els.importer.hidden = true;
    });

    els.loadImportSource?.addEventListener("click", () => {
      const pob = pobImports[els.importSource.value];
      if (!pob) {
        setImportStatus("没有可载入的本地缓存源。", "error");
        return;
      }
      els.importCode.value = pob.code;
      if (els.importUrl) els.importUrl.value = pob.sourceUrl || "";
      setImportStatus(`已载入：${pob.label}`);
    });

    els.parseImportCode?.addEventListener("click", parseImporterDraft);
    els.parseImportCode?.addEventListener("click", () => {
      setTimeout(refreshImporterVisualPreview, 900);
    });

    els.saveDraft?.addEventListener("click", () => {
      try {
        const draft = JSON.parse(els.draftOutput.value || "{}");
        if (!draft.id || !draft.title) throw new Error("请先生成有效草稿。");
        storeImportedDraft(draft);
        state.selectedId = draft.id;
        renderBuildCatalog();
        renderDetail();
        applyLanguage();
        els.importer.hidden = true;
      } catch (error) {
        setImportStatus(error.message || "本地导入失败。", "error");
      }
    });

    els.copyDraft?.addEventListener("click", () => {
      if (!els.draftOutput.value.trim()) {
        setImportStatus("请先生成草稿。", "error");
        return;
      }
      copyText(els.draftOutput.value, els.copyDraft);
    });

    els.search.addEventListener("input", (event) => {
      state.query = event.target.value;
      renderBuildCatalog();
      applyLanguage();
    });

    els.chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        state.filter = chip.dataset.filter;
        els.chips.forEach((item) => item.classList.toggle("is-active", item === chip));
        renderBuildCatalog();
        applyLanguage();
      });
    });

    document.addEventListener("click", (event) => {
      const buildButton = event.target.closest("[data-build-id]");
      if (buildButton) {
        state.selectedId = buildButton.dataset.buildId;
        renderBuildCatalog();
        renderDetail();
        applyLanguage();
        return;
      }

      const conceptButton = event.target.closest("[data-concept-id]");
      if (conceptButton) {
        state.conceptId = conceptButton.dataset.conceptId;
        renderChronicle();
        applyLanguage();
        return;
      }

      if (event.target.closest("[data-reset-concept]")) {
        state.conceptId = "";
        renderChronicle();
        applyLanguage();
        return;
      }

      const copyButton = event.target.closest("[data-copy-pob]");
      if (copyButton) {
        const pob = pobImports[copyButton.dataset.copyPob];
        if (pob) copyText(pob.code, copyButton);
      }
    });

    els.languageToggle?.addEventListener("click", () => {
      currentLang = currentLang === "zh" ? "en" : "zh";
      localStorage.setItem("toolman.lang", currentLang);
      rerender();
    });
  }

  async function copyText(text, button) {
    const oldText = button.textContent;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      button.textContent = "已复制";
    } catch (_error) {
      button.textContent = "复制失败";
    } finally {
      setTimeout(() => {
        button.textContent = oldText;
      }, 1400);
    }
  }

  renderBuildCatalog();
  renderDetail();
  renderChronicle();
  bindEvents();
  applyLanguage();
})();

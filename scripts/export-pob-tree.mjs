import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(siteRoot, "..");
const version = getArg("version") || "0_4";
const treeDir = path.join(repoRoot, "Path of Building Community (PoE2)", "TreeData", version);
const luaInputPath = path.join(treeDir, "tree.lua");
const jsonInputPath = path.join(treeDir, "tree.json");
const outputPath = path.join(siteRoot, "data", `pob-tree-${version}.js`);

const luaText = await fs.readFile(luaInputPath, "utf8");
const jsonTree = JSON.parse(await fs.readFile(jsonInputPath, "utf8"));
const orbitRadii = jsonTree.constants.orbitRadii;
const orbitAnglesByOrbit = jsonTree.constants.orbitAnglesByOrbit;
const rawGroups = parseGroups(extractTopLevelTable(luaText, "groups"));
const rawNodes = parseNodes(extractTopLevelTable(luaText, "nodes"));

const nodes = {};
const classStarts = {};
const ascendancyStarts = {};

for (const [id, node] of Object.entries(rawNodes)) {
  if (id === "root" || !node.group || !rawGroups[node.group]) continue;
  const group = rawGroups[node.group];
  const angle = orbitAnglesByOrbit[node.orbit]?.[node.orbitIndex];
  const radius = orbitRadii[node.orbit];
  if (angle == null || radius == null) continue;

  const x = group.x + Math.sin(angle) * radius;
  const y = group.y - Math.cos(angle) * radius;
  const type = nodeType(node);
  const out = {
    id: Number(node.skill || id),
    x: Math.round(x * 100) / 100,
    y: Math.round(y * 100) / 100,
    name: node.name || "",
    type,
    stats: node.stats || [],
    ascendancyName: node.ascendancyName || "",
    group: Number(node.group),
    orbit: Number(node.orbit || 0),
    orbitIndex: Number(node.orbitIndex || 0),
    connections: (node.connections || [])
      .map((connection) => ({
        id: Number(connection.id),
        orbit: Number(connection.orbit || 0)
      }))
      .filter((connection) => connection.id)
  };

  nodes[out.id] = out;
  if (node.classesStart) {
    for (const className of node.classesStart) classStarts[className] = out.id;
  }
  if (node.isAscendancyStart && node.ascendancyName) {
    ascendancyStarts[node.ascendancyName] = out.id;
  }
}

const payload = {
  version,
  bounds: {
    minX: jsonTree.min_x,
    maxX: jsonTree.max_x,
    minY: jsonTree.min_y,
    maxY: jsonTree.max_y
  },
  orbitRadii,
  groups: Object.fromEntries(
    Object.entries(rawGroups)
      .filter(([, group]) => group && Number.isFinite(group.x) && Number.isFinite(group.y))
      .map(([id, group]) => [id, { id: Number(id), x: group.x, y: group.y }])
  ),
  classStarts,
  ascendancyStarts,
  nodes
};

await fs.writeFile(outputPath, `window.POB_TREE_${version} = ${JSON.stringify(payload)};\n`, "utf8");
console.log(`Wrote ${path.relative(siteRoot, outputPath)} with ${Object.keys(nodes).length} nodes`);

function getArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? "" : process.argv[index + 1] || "";
}

function nodeType(node) {
  if (node.classesStart?.length) return "ClassStart";
  if (node.isAscendancyStart) return "AscendancyStart";
  if (node.isOnlyImage) return "OnlyImage";
  if (node.isJewelSocket || node.containJewelSocket) return "Socket";
  if (node.ks || node.isKeystone) return "Keystone";
  if (node.not || node.isNotable) return "Notable";
  if (node.isAttribute) return "Attribute";
  if (node.ascendancyName) return "Ascendancy";
  return "Normal";
}

function extractTopLevelTable(text, name) {
  const marker = `\n\t${name}={`;
  const markerIndex = text.indexOf(marker);
  if (markerIndex === -1) throw new Error(`Could not find ${name} table in tree.lua`);
  const start = text.indexOf("{", markerIndex);
  const end = findMatchingBrace(text, start);
  return text.slice(start + 1, end);
}

function findMatchingBrace(text, start) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const char = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }
    if (char === "\"") inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  throw new Error("Unbalanced Lua table");
}

function iterateNumericEntries(sectionText) {
  const entries = [];
  let i = 0;
  while (i < sectionText.length) {
    const match = /\[(\d+)\]=\{/g;
    match.lastIndex = i;
    const found = match.exec(sectionText);
    if (!found) break;
    const open = sectionText.indexOf("{", found.index);
    const close = findMatchingBrace(sectionText, open);
    entries.push([found[1], sectionText.slice(open + 1, close)]);
    i = close + 1;
  }
  return entries;
}

function parseGroups(sectionText) {
  const groups = {};
  for (const [id, body] of iterateNumericEntries(sectionText)) {
    groups[id] = {
      id: Number(id),
      x: numberField(body, "x"),
      y: numberField(body, "y"),
      isProxy: boolField(body, "isProxy")
    };
  }
  return groups;
}

function parseNodes(sectionText) {
  const parsed = {};
  for (const [id, body] of iterateNumericEntries(sectionText)) {
    parsed[id] = {
      id: Number(id),
      skill: numberField(body, "skill") || Number(id),
      group: numberField(body, "group"),
      orbit: numberField(body, "orbit") || 0,
      orbitIndex: numberField(body, "orbitIndex") || 0,
      name: stringField(body, "name"),
      stats: stringArrayField(body, "stats"),
      connections: connectionField(body),
      ascendancyName: stringField(body, "ascendancyName"),
      classesStart: stringArrayField(body, "classesStart"),
      isProxy: boolField(body, "isProxy"),
      isOnlyImage: boolField(body, "isOnlyImage"),
      isJewelSocket: boolField(body, "isJewelSocket"),
      containJewelSocket: boolField(body, "containJewelSocket"),
      isKeystone: boolField(body, "isKeystone") || boolField(body, "ks"),
      isNotable: boolField(body, "isNotable") || boolField(body, "not"),
      isAttribute: boolField(body, "isAttribute"),
      isAscendancyStart: boolField(body, "isAscendancyStart")
    };
  }
  return parsed;
}

function numberField(body, name) {
  const matches = Array.from(body.matchAll(new RegExp(`(?:^|\\n)(\\s*)(?:\\["${escapeRegExp(name)}"\\]|${escapeRegExp(name)})=(-?\\d+(?:\\.\\d+)?)`, "g")));
  const match = shallowest(matches);
  return match ? Number(match[2]) : undefined;
}

function stringField(body, name) {
  const matches = Array.from(body.matchAll(new RegExp(`(?:^|\\n)(\\s*)(?:\\["${escapeRegExp(name)}"\\]|${escapeRegExp(name)})="((?:\\\\.|[^"])*)"`, "g")));
  const match = shallowest(matches);
  return match ? match[2].replace(/\\"/g, "\"").replace(/\\\\/g, "\\") : "";
}

function boolField(body, name) {
  const matches = Array.from(body.matchAll(new RegExp(`(?:^|\\n)(\\s*)(?:\\["${escapeRegExp(name)}"\\]|${escapeRegExp(name)})=true`, "g")));
  return Boolean(shallowest(matches));
}

function stringArrayField(body, name) {
  const matches = Array.from(body.matchAll(new RegExp(`(?:^|\\n)(\\s*)${escapeRegExp(name)}=\\{`, "g")));
  const match = shallowest(matches);
  if (!match) return [];
  const markerIndex = match.index + match[0].lastIndexOf(`${name}={`);
  const open = body.indexOf("{", markerIndex);
  const close = findMatchingBrace(body, open);
  const table = body.slice(open + 1, close);
  return Array.from(table.matchAll(/\[\d+\]="((?:\\.|[^"])*)"/g), (match) => match[1].replace(/\\"/g, "\"").replace(/\\\\/g, "\\"));
}

function connectionField(body) {
  const marker = "connections={";
  const markerIndex = body.indexOf(marker);
  if (markerIndex === -1) return [];
  const open = body.indexOf("{", markerIndex);
  const close = findMatchingBrace(body, open);
  const table = body.slice(open + 1, close);
  return iterateNumericEntries(table).map(([, entry]) => ({
    id: numberField(entry, "id"),
    orbit: numberField(entry, "orbit") || 0
  })).filter((connection) => connection.id);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function shallowest(matches) {
  if (!matches.length) return null;
  return matches
    .map((match) => ({ match, indent: match[1].length }))
    .sort((a, b) => a.indent - b.indent || a.match.index - b.match.index)[0].match;
}

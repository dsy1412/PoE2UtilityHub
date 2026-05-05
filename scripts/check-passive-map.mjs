import fs from "node:fs";
import vm from "node:vm";
import zlib from "node:zlib";

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync("toolman-bd-wiki/data/pob-imports.js", "utf8"), ctx);
vm.runInNewContext(fs.readFileSync("toolman-bd-wiki/data/pob-tree-0_4.js", "utf8"), ctx);

const pobTree = ctx.window.POB_TREE_0_4;
const code = ctx.window.POB_IMPORTS["poe-ninja-ddddddddysira"].code;
const xml = zlib.inflateSync(Buffer.from(code.replace(/-/g, "+").replace(/_/g, "/"), "base64")).toString();
const passiveNodes = (xml.match(/<Spec[^>]*nodes="([^"]+)/)?.[1] || "").split(",").filter(Boolean);
const allocated = new Set(passiveNodes.map(String));
const allocatedNodes = passiveNodes.map((id) => pobTree.nodes[String(id)]).filter(Boolean);

const xs = allocatedNodes.map((node) => node.x);
const ys = allocatedNodes.map((node) => node.y);
const padding = 1150;
const minX = Math.min(...xs) - padding;
const maxX = Math.max(...xs) + padding;
const minY = Math.min(...ys) - padding;
const maxY = Math.max(...ys) + padding;
const visibleNodes = Object.values(pobTree.nodes).filter((node) => (
  node.x >= minX && node.x <= maxX && node.y >= minY && node.y <= maxY && node.type !== "OnlyImage"
));
const visibleSet = new Set(visibleNodes.map((node) => String(node.id)));
const connectors = collectVisibleConnectors(visibleNodes, visibleSet);
const activeConnectors = connectors.filter((connector) => allocated.has(String(connector.a.id)) && allocated.has(String(connector.b.id)));
const crossAscendancy = activeConnectors.filter(({ a, b }) => (a.ascendancyName || "") !== (b.ascendancyName || ""));
const longest = [...activeConnectors]
  .map(({ a, b }) => ({ a: a.id, b: b.id, dist: Math.hypot(b.x - a.x, b.y - a.y), aName: a.ascendancyName || "", bName: b.ascendancyName || "" }))
  .sort((a, b) => b.dist - a.dist)
  .slice(0, 10);

console.log(JSON.stringify({
  passiveNodes: passiveNodes.length,
  allocatedExported: allocatedNodes.length,
  visibleNodes: visibleNodes.length,
  connectors: connectors.length,
  activeConnectors: activeConnectors.length,
  crossAscendancy: crossAscendancy.length,
  longest
}, null, 2));

function collectVisibleConnectors(nodes, visibleIds) {
  const connectors = [];
  const seen = new Set();
  for (const node of nodes) {
    for (const connection of node.connections || []) {
      const otherId = typeof connection === "object" ? connection.id : connection;
      if (!visibleIds.has(String(otherId))) continue;
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

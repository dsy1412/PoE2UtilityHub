import fs from "node:fs";
import vm from "node:vm";
import zlib from "node:zlib";

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync("toolman-bd-wiki/data/pob-imports.js", "utf8"), ctx);
const code = ctx.window.POB_IMPORTS["poe-ninja-ddddddddysira"].code;
const xml = zlib.inflateSync(Buffer.from(code.replace(/-/g, "+").replace(/_/g, "/"), "base64")).toString();
const ids = (xml.match(/<Spec[^>]*nodes="([^"]+)/)?.[1] || "").split(",").filter(Boolean);

console.log("xml target", xml.match(/targetVersion="([^"]+)/)?.[1], "ids", ids.length);
for (const version of ["0_1", "0_2", "0_3", "0_4"]) {
  const tree = JSON.parse(fs.readFileSync(`Path of Building Community (PoE2)/TreeData/${version}/tree.json`, "utf8"));
  const hit = ids.filter((id) => tree.nodes[id]);
  const miss = ids.filter((id) => !tree.nodes[id]);
  console.log(version, hit.length, "missing", miss.join(","));
}

const exportedCtx = { window: {} };
vm.runInNewContext(fs.readFileSync("toolman-bd-wiki/data/pob-tree-0_4.js", "utf8"), exportedCtx);
const raw04 = JSON.parse(fs.readFileSync("Path of Building Community (PoE2)/TreeData/0_4/tree.json", "utf8"));
const exported = exportedCtx.window.POB_TREE_0_4.nodes;
const notExported = ids.filter((id) => !exported[id]);
console.log("not exported", notExported.length);
for (const id of notExported) {
  const node = raw04.nodes[id];
  console.log(id, {
    name: node?.name,
    group: node?.group,
    orbit: node?.orbit,
    orbitIndex: node?.orbitIndex,
    ascendancyName: node?.ascendancyName,
    isOnlyImage: node?.isOnlyImage,
    connections: node?.connections
  });
}

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const defaultSeedPath = path.join(rootDir, "data", "poe2db-seeds.json");
const defaultJsonPath = path.join(rootDir, "data", "poe2db-items.json");
const defaultJsPath = path.join(rootDir, "data", "poe2db-items.js");
const defaultIconDir = path.join(rootDir, "assets", "poe2db-icons");
const baseUrl = "https://poe2db.tw/cn/";
const uniqueIndexUrl = "https://poe2db.tw/cn/Unique_item";

const args = parseArgs(process.argv.slice(2));

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});

async function main() {
  const seedPath = path.resolve(rootDir, args.seed || defaultSeedPath);
  const jsonPath = path.resolve(rootDir, args.out || defaultJsonPath);
  const jsPath = path.resolve(rootDir, args.js || defaultJsPath);
  const iconDir = path.resolve(rootDir, args["icon-dir"] || defaultIconDir);
  const delayMs = Number(args.delay || 900);
  const limit = args.limit ? Number(args.limit) : 0;

  if (args["all-uniques"]) {
    console.log(`读取暗金列表：${uniqueIndexUrl}`);
    const html = await fetchText(uniqueIndexUrl);
    const items = parseUniqueIndex(html, uniqueIndexUrl);
    const limitedItems = limit > 0 ? items.slice(0, limit) : items;
    if (args["download-icons"]) await downloadIcons(limitedItems, iconDir);
    await writeOutputs(limitedItems, jsonPath, jsPath);
    console.log(`暗金装备 ${limitedItems.length}/${items.length} 条`);
    return;
  }

  const seeds = await readSeeds(seedPath, args);
  if (!seeds.length) {
    throw new Error("没有抓取目标。请在 data/poe2db-seeds.json 添加 slug/url，或传入 --slug/--url。");
  }

  const items = [];
  for (const [index, seed] of seeds.entries()) {
    const url = targetToUrl(seed);
    console.log(`[${index + 1}/${seeds.length}] ${url}`);
    const html = await fetchText(url);
    const item = extractItem(seed, url, html);
    items.push(item);
    if (index < seeds.length - 1) await sleep(delayMs);
  }

  if (args["download-icons"]) await downloadIcons(items, iconDir);
  await writeOutputs(items, jsonPath, jsPath);
}

async function writeOutputs(items, jsonPath, jsPath) {
  await fs.writeFile(jsonPath, `${JSON.stringify(items, null, 2)}\n`, "utf8");
  await fs.writeFile(jsPath, `window.POE2DB_ITEMS = ${JSON.stringify(items, null, 2)};\n`, "utf8");
  console.log(`写入 ${path.relative(rootDir, jsonPath)} 和 ${path.relative(rootDir, jsPath)}`);
}

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
    } else if (parsed[key]) {
      parsed[key] = Array.isArray(parsed[key]) ? [...parsed[key], next] : [parsed[key], next];
      i += 1;
    } else {
      parsed[key] = next;
      i += 1;
    }
  }
  return parsed;
}

async function readSeeds(seedPath, cliArgs) {
  const seeds = [];
  try {
    const raw = await fs.readFile(seedPath, "utf8");
    seeds.push(...JSON.parse(raw));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  for (const slug of toArray(cliArgs.slug)) seeds.push({ slug });
  for (const url of toArray(cliArgs.url)) seeds.push({ url });

  const seen = new Set();
  return seeds.filter((seed) => {
    const key = seed.url || seed.slug;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function targetToUrl(seed) {
  if (seed.url) return seed.url;
  return new URL(encodeURIComponent(seed.slug), baseUrl).toString();
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "accept": "text/html,application/xhtml+xml",
      "user-agent": "toolman-bd-wiki local cache crawler; contact: local personal use"
    }
  });

  if (!response.ok) {
    throw new Error(`请求失败 ${response.status}: ${url}`);
  }

  return response.text();
}

function extractItem(seed, sourceUrl, html) {
  const text = decodeHtmlEntities(stripScriptsButKeepItemJson(html));
  const jsonText = findBalancedJson(text, '"realm": "poe2"') || findBalancedJson(text, "\"realm\":\"poe2\"");
  if (!jsonText) {
    throw new Error(`没有在页面中找到物品 JSON: ${sourceUrl}`);
  }

  let raw;
  try {
    raw = JSON.parse(jsonText);
  } catch (error) {
    throw new Error(`物品 JSON 解析失败: ${sourceUrl}\n${error.message}`);
  }

  const pageTitle = extractHeadingText(text);
  const cnName = seed.cnName || pageTitle || raw.name;
  const slug = seed.slug || slugFromUrl(sourceUrl);

  return {
    id: slugToId(slug || raw.name),
    slug,
    name: raw.name,
    cnName,
    typeLine: raw.typeLine,
    baseType: raw.baseType,
    rarity: raw.rarity,
    sourceUrl,
    icon: raw.icon,
    width: raw.w,
    height: raw.h,
    implicitMods: raw.implicitMods || [],
    explicitMods: raw.explicitMods || [],
    flavourText: raw.flavourText || [],
    note: seed.note || "",
    crawledAt: new Date().toISOString()
  };
}

function parseUniqueIndex(html, sourceUrl) {
  const blocks = html.split('<div class="col"><div class="d-flex border-top rounded">');
  const items = [];
  const crawledAt = new Date().toISOString();

  for (const block of blocks) {
    if (!block.includes("uniqueName") || !block.includes("panel-item-icon")) continue;

    const slug = getMatch(block, /href="\/cn\/([^"]+)"/) || getMatch(block, /href="([^"]+)"/);
    const icon = getMatch(block, /<img[^>]+src="([^"]+)"/);
    const cnName = cleanText(getMatch(block, /<span class="uniqueName">([\s\S]*?)<\/span>/));
    const typeLine = cleanText(getMatch(block, /<span class="uniqueTypeLine">([\s\S]*?)<\/span>/));
    const implicitMods = extractClassMods(block, "implicitMod");
    const explicitMods = extractClassMods(block, "explicitMod");

    if (!slug || !cnName) continue;

    items.push({
      id: slugToId(slug),
      slug,
      name: slug.replaceAll("_", " "),
      cnName,
      typeLine,
      rarity: "Unique",
      sourceUrl: new URL(slug, baseUrl).toString(),
      icon,
      implicitMods,
      explicitMods,
      crawledAt
    });
  }

  if (!items.length) {
    throw new Error(`没有从暗金列表中解析到装备: ${sourceUrl}`);
  }

  return dedupeItems(items);
}

function extractClassMods(block, className) {
  const mods = [];
  const pattern = new RegExp(`<div class="${className}">([\\s\\S]*?)<\\/div>`, "g");
  let match;
  while ((match = pattern.exec(block))) {
    const mod = cleanText(match[1]);
    if (mod) mods.push(mod);
  }
  return mods;
}

function getMatch(value, pattern) {
  const match = value.match(pattern);
  return match ? match[1] : "";
}

function cleanText(value) {
  return decodeHtmlEntities(String(value || "")
    .replace(/<span[^>]*class=['"]mod-value['"][^>]*>([\s\S]*?)<\/span>/g, "$1")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim());
}

function dedupeItems(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

async function downloadIcons(items, iconDir) {
  await fs.mkdir(iconDir, { recursive: true });
  for (const [index, item] of items.entries()) {
    if (!item.icon) continue;
    const ext = path.extname(new URL(item.icon).pathname) || ".webp";
    const filename = `${item.id}${ext}`;
    const absolutePath = path.join(iconDir, filename);
    const relativePath = `./assets/poe2db-icons/${filename}`;

    try {
      await fs.access(absolutePath);
      item.localIcon = relativePath;
      continue;
    } catch {
      // Missing file; download below.
    }

    console.log(`下载图标 ${index + 1}/${items.length}: ${item.cnName || item.name}`);
    const response = await fetch(item.icon, {
      headers: {
        "accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "user-agent": "toolman-bd-wiki local icon cache crawler; contact: local personal use"
      }
    });
    if (!response.ok) {
      console.warn(`图标下载失败 ${response.status}: ${item.icon}`);
      continue;
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(absolutePath, bytes);
    item.localIcon = relativePath;
  }
}

function stripScriptsButKeepItemJson(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h1|h2|h3|h4|td|th)>/gi, "\n")
    .replace(/<[^>]+>/g, "");
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function findBalancedJson(text, marker) {
  const markerIndex = text.indexOf(marker);
  if (markerIndex === -1) return "";

  const start = text.lastIndexOf("{", markerIndex);
  if (start === -1) return "";

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === "\\") {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }

  return "";
}

function extractHeadingText(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const index = lines.findIndex((line) => line.startsWith("### "));
  return index === -1 ? "" : lines[index].replace(/^#+\s*/, "");
}

function slugFromUrl(url) {
  const pathname = new URL(url).pathname;
  return decodeURIComponent(pathname.split("/").filter(Boolean).pop() || "");
}

function slugToId(value) {
  return String(value)
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const pages = [
  { kind: "skill", cn: "https://poe2db.tw/cn/Skill_Gems", us: "https://poe2db.tw/us/Skill_Gems" },
  { kind: "support", cn: "https://poe2db.tw/cn/Support_Gems", us: "https://poe2db.tw/us/Support_Gems" }
];
const jsonPath = path.join(rootDir, "data", "poe2db-skill-gems.json");
const jsPath = path.join(rootDir, "data", "poe2db-skill-gems.js");
const iconDir = path.join(rootDir, "assets", "poe2db-skill-icons");

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});

async function main() {
  const bySlug = new Map();
  for (const page of pages) {
    const cnHtml = await fetchText(page.cn);
    const usHtml = await fetchText(page.us);
    const cnRows = parseGemRows(cnHtml, "cn", page.kind, page.cn);
    const usRows = parseGemRows(usHtml, "us", page.kind, page.us);
    for (const item of cnRows) mergeItem(bySlug, item);
    for (const item of usRows) mergeItem(bySlug, item);
  }
  const items = Array.from(bySlug.values()).sort((a, b) => a.name.localeCompare(b.name));
  await downloadIcons(items);
  await fs.writeFile(jsonPath, `${JSON.stringify(items, null, 2)}\n`, "utf8");
  await fs.writeFile(jsPath, `window.POE2DB_SKILL_GEMS = ${JSON.stringify(items, null, 2)};\n`, "utf8");
  console.log(`Skill gem icons ${items.filter((item) => item.localIcon).length}/${items.length}`);
}

async function fetchText(url) {
  console.log(url);
  const response = await fetch(url, {
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": "toolman-bd-wiki skill icon crawler; contact: local personal use"
    }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  return response.text();
}

function parseGemRows(html, locale, kind, sourceUrl) {
  const rows = [];
  const rowPattern = /<tr data-tags='([^']*)'>([\s\S]*?)(?=<tr data-tags='|<\/tbody>|<\/table>)/g;
  let match;
  while ((match = rowPattern.exec(html))) {
    const [, tags, block] = match;
    const href = getMatch(block, /href="\/(?:cn|us)\/([^"]+)"/);
    const icon = getMatch(block, /<img[^>]+src="([^"]+)"/);
    if (!href || !icon) continue;
    const slug = decodeHtmlEntities(href);
    const anchors = Array.from(block.matchAll(/<a\b[^>]*href="\/(?:cn|us)\/[^"]+"[^>]*>([\s\S]*?)<\/a>/g))
      .map((item) => cleanText(item[1]))
      .filter(Boolean)
      .filter((text) => !/^https?:/.test(text));
    const displayName = anchors.find((text) => !/\.(webp|png)$/i.test(text)) || slug.replaceAll("_", " ");
    const tier = Number(getMatch(block, /\((\d+)\)/)) || 0;
    const nameFromTags = extractEnglishNameFromTags(tags, slug);
    rows.push({
      id: slugToId(slug),
      slug,
      kind,
      name: locale === "us" ? cleanGemName(displayName) : cleanGemName(nameFromTags || slug.replaceAll("_", " ")),
      cnName: locale === "cn" ? cleanGemName(displayName) : "",
      icon,
      tier,
      sourceUrl: new URL(`/${locale}/${slug}`, sourceUrl).toString(),
      crawledAt: new Date().toISOString()
    });
  }
  return rows;
}

function extractEnglishNameFromTags(tags, slug) {
  const slugWords = slug.replaceAll("_", " ");
  if (tags.includes(slugWords)) return slugWords;
  const parts = String(tags || "").split(/\s+/);
  const slugLast = slugWords.split(/\s+/).pop();
  const index = parts.findIndex((part) => part === slugLast);
  if (index === -1) return "";
  return parts.slice(Math.max(0, index - slugWords.split(/\s+/).length + 1), index + 1).join(" ");
}

function mergeItem(map, item) {
  const current = map.get(item.id) || {};
  map.set(item.id, {
    ...current,
    ...item,
    name: item.name && item.name !== item.slug.replaceAll("_", " ") ? item.name : current.name || item.name,
    cnName: item.cnName || current.cnName || "",
    icon: item.icon || current.icon || "",
    sourceUrl: item.sourceUrl || current.sourceUrl || ""
  });
}

async function downloadIcons(items) {
  await fs.mkdir(iconDir, { recursive: true });
  for (const [index, item] of items.entries()) {
    if (!item.icon) continue;
    const ext = path.extname(new URL(item.icon).pathname) || ".webp";
    const filename = `${item.id}${ext}`;
    const absolutePath = path.join(iconDir, filename);
    item.localIcon = `./assets/poe2db-skill-icons/${filename}`;
    try {
      await fs.access(absolutePath);
      continue;
    } catch {
      // Download below.
    }
    console.log(`download ${index + 1}/${items.length}: ${item.name || item.cnName}`);
    const response = await fetch(item.icon, {
      headers: {
        accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        referer: item.sourceUrl || "https://poe2db.tw/",
        "user-agent": "Mozilla/5.0 toolman-bd-wiki skill icon crawler"
      }
    });
    if (!response.ok) {
      console.warn(`icon failed ${response.status}: ${item.icon}`);
      item.localIcon = "";
      continue;
    }
    await fs.writeFile(absolutePath, Buffer.from(await response.arrayBuffer()));
  }
}

function cleanGemName(value) {
  return cleanText(value).replace(/\s*\(\d+\)\s*$/, "").trim();
}

function getMatch(value, pattern) {
  const match = String(value || "").match(pattern);
  return match ? match[1] : "";
}

function cleanText(value) {
  return decodeHtmlEntities(String(value || "")
    .replace(/<img\b[\s\S]*?>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim());
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function slugToId(value) {
  return String(value || "")
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

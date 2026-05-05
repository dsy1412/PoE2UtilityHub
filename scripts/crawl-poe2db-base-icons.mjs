import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const baseUrl = "https://poe2db.tw/cn/";
const fallbackBaseUrl = "https://poe2db.tw/us/";
const cdnBaseUrl = "https://cdn.poe2db.tw/image/";
const defaultSeedPath = path.join(rootDir, "data", "poe2db-base-seeds.json");
const defaultJsonPath = path.join(rootDir, "data", "poe2db-base-items.json");
const defaultJsPath = path.join(rootDir, "data", "poe2db-base-items.js");
const defaultIconDir = path.join(rootDir, "assets", "poe2db-base-icons");

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
  const delayMs = Number(args.delay || 300);
  const seeds = await readSeeds(seedPath, args);
  if (!seeds.length) throw new Error("No base item seeds found.");

  const items = [];
  for (const [index, seed] of seeds.entries()) {
    const item = await crawlBaseItem(seed, index + 1, seeds.length);
    if (item) items.push(item);
    if (index < seeds.length - 1) await sleep(delayMs);
  }

  await downloadIcons(items, iconDir);
  await fs.writeFile(jsonPath, `${JSON.stringify(items, null, 2)}\n`, "utf8");
  await fs.writeFile(jsPath, `window.POE2DB_BASE_ITEMS = ${JSON.stringify(items, null, 2)};\n`, "utf8");
  console.log(`Base icons ${items.filter((item) => item.localIcon).length}/${items.length}`);
}

async function crawlBaseItem(seed, index, total) {
  const slug = seed.slug || slugFromName(seed.name);
  const urls = [new URL(slug, baseUrl).toString(), new URL(slug, fallbackBaseUrl).toString()];
  for (const sourceUrl of urls) {
    try {
      console.log(`[${index}/${total}] ${sourceUrl}`);
      const html = await fetchText(sourceUrl);
      const icon = extractIcon(html);
      if (!icon) continue;
      return {
        id: slugToId(slug),
        slug,
        name: seed.name || extractBaseType(html) || slug.replaceAll("_", " "),
        cnName: extractHeading(html) || seed.cnName || "",
        sourceUrl,
        icon,
        crawledAt: new Date().toISOString()
      };
    } catch (error) {
      console.warn(`${sourceUrl} ${error.message}`);
    }
  }
  console.warn(`Missing base icon: ${seed.name || slug}`);
  return {
    id: slugToId(slug),
    slug,
    name: seed.name || slug.replaceAll("_", " "),
    cnName: seed.cnName || "",
    sourceUrl: urls[0],
    icon: "",
    crawledAt: new Date().toISOString()
  };
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": "toolman-bd-wiki base icon crawler; contact: local personal use"
    }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

function extractIcon(html) {
  const decoded = decodeHtmlEntities(html);
  const fullUrl = decoded.match(/https?:\/\/cdn\.poe2db\.tw\/image\/Art\/2DItems\/[^"'\s<>]+?\.(?:webp|png)/i)?.[0];
  if (fullUrl) return fullUrl;

  const iconPath = decoded.match(/Icon[\s\S]{0,300}?(Art\/2DItems\/[A-Za-z0-9_./-]+)/i)?.[1]
    || decoded.match(/(Art\/2DItems\/[A-Za-z0-9_./-]+)(?:\.webp|["'<\s])/i)?.[1];
  if (!iconPath) return "";
  return `${cdnBaseUrl}${iconPath.replace(/\.(webp|png)$/i, "")}.webp`;
}

function extractBaseType(html) {
  const text = stripTags(decodeHtmlEntities(html));
  return text.match(/BaseType\s+([^\n]+)/)?.[1]?.trim() || "";
}

function extractHeading(html) {
  const match = html.match(/<h[1-5][^>]*>([\s\S]*?)<\/h[1-5]>/i);
  return match ? stripTags(decodeHtmlEntities(match[1])).trim() : "";
}

async function downloadIcons(items, iconDir) {
  await fs.mkdir(iconDir, { recursive: true });
  for (const [index, item] of items.entries()) {
    if (!item.icon) continue;
    const ext = path.extname(new URL(item.icon).pathname) || ".webp";
    const filename = `${item.id}${ext}`;
    const absolutePath = path.join(iconDir, filename);
    item.localIcon = `./assets/poe2db-base-icons/${filename}`;
    try {
      await fs.access(absolutePath);
      continue;
    } catch {
      // Download below.
    }
    console.log(`download ${index + 1}/${items.length}: ${item.name}`);
    const response = await fetchIcon(item);
    if (!response.ok) {
      console.warn(`icon failed ${response.status}: ${item.icon}`);
      item.localIcon = "";
      continue;
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(absolutePath, bytes);
  }
}

async function fetchIcon(item) {
  const headers = {
    accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    referer: item.sourceUrl || "https://poe2db.tw/",
    "user-agent": "Mozilla/5.0 toolman-bd-wiki base icon crawler"
  };
  let response = await fetch(item.icon, { headers });
  if (response.ok || !item.icon.includes("cdn.poe2db.tw/image/")) return response;
  const sameOrigin = item.icon.replace("https://cdn.poe2db.tw/image/", "https://poe2db.tw/image/");
  response = await fetch(sameOrigin, { headers });
  if (response.ok) item.icon = sameOrigin;
  return response;
}

async function readSeeds(seedPath, cliArgs) {
  const seeds = [];
  try {
    seeds.push(...JSON.parse(await fs.readFile(seedPath, "utf8")));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  for (const slug of toArray(cliArgs.slug)) seeds.push({ slug, name: slug.replaceAll("_", " ") });
  const seen = new Set();
  return seeds.filter((seed) => {
    const key = seed.slug || seed.name;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function slugFromName(value) {
  return String(value || "").trim().replace(/\s+/g, "_");
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

function stripTags(value) {
  return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const defaultSourcePath = path.join(rootDir, "data", "pob-sources.json");
const defaultOutputPath = path.join(rootDir, "data", "pob-imports.js");

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});

async function main() {
  const sourcePath = path.resolve(rootDir, getArg("source") || defaultSourcePath);
  const outputPath = path.resolve(rootDir, getArg("out") || defaultOutputPath);
  const sources = JSON.parse(await fs.readFile(sourcePath, "utf8"));
  const imports = {};

  for (const source of sources) {
    const normalized = normalizeSource(source);
    console.log(`抓取 PoB 导入码：${normalized.label}`);
    const response = await fetch(normalized.rawUrl, {
      headers: {
        accept: "text/plain",
        "user-agent": "toolman-bd-wiki local pob cache crawler"
      }
    });

    if (!response.ok) {
      throw new Error(`poe.ninja raw 请求失败 ${response.status}: ${normalized.rawUrl}`);
    }

    const code = (await response.text()).trim();
    if (!/^eN/.test(code) || code.length < 100) {
      throw new Error(`导入码看起来不正确: ${normalized.rawUrl}`);
    }

    imports[normalized.id] = {
      label: normalized.label,
      sourceUrl: normalized.profileUrl,
      rawUrl: normalized.rawUrl,
      protocolUrl: normalized.protocolUrl,
      updatedAt: new Date().toISOString(),
      code
    };
  }

  await fs.writeFile(outputPath, `window.POB_IMPORTS = ${JSON.stringify(imports, null, 2)};\n`, "utf8");
  console.log(`写入 ${path.relative(rootDir, outputPath)}`);
}

function getArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? "" : process.argv[index + 1] || "";
}

function normalizeSource(source) {
  const fromProfile = source.profileUrl ? parseProfileUrl(source.profileUrl) : {};
  const account = source.account || fromProfile.account;
  const league = source.league || fromProfile.league;
  const character = source.character || fromProfile.character;

  if (!account || !league || !character) {
    throw new Error(`PoB source 缺少 account/league/character: ${JSON.stringify(source)}`);
  }

  const encodedAccount = encodeURIComponent(account);
  const encodedCharacter = encodeURIComponent(character);
  const id = source.id || `poe-ninja-${slugify(character)}`;
  const profileUrl = source.profileUrl || `https://poe.ninja/poe2/profile/${encodedAccount}/${league}/character/${encodedCharacter}`;
  const rawUrl = `https://poe.ninja/poe2/pob/raw/profile/code/${encodedAccount}/${league}/${encodedCharacter}`;
  const protocolUrl = `pob2://poeninja/profile/code/${encodedAccount}/${league}/${encodedCharacter}`;

  return {
    id,
    label: source.label || `poe.ninja / ${character}`,
    profileUrl,
    rawUrl,
    protocolUrl
  };
}

function parseProfileUrl(url) {
  const parsed = new URL(url);
  const parts = parsed.pathname.split("/").filter(Boolean);
  const profileIndex = parts.indexOf("profile");
  if (profileIndex === -1) return {};
  return {
    account: decodeURIComponent(parts[profileIndex + 1] || ""),
    league: decodeURIComponent(parts[profileIndex + 2] || ""),
    character: decodeURIComponent(parts[profileIndex + 4] || "")
  };
}

function slugify(value) {
  return String(value)
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

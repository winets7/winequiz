/**
 * Однократная загрузка PNG флагов (w320) в public/flags для self-host.
 * Запуск: node scripts/download-flags.mjs
 * Источник: flagcdn (только при генерации ассетов; в рантайме сайт их не тянет).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "public", "flags");

/** Должен совпадать с WINE_COUNTRY_TO_ISO в src/lib/wine-data.ts */
const ISO_CODES = [
  "au",
  "at",
  "ar",
  "br",
  "hu",
  "de",
  "gr",
  "ge",
  "il",
  "es",
  "it",
  "ca",
  "cn",
  "lb",
  "mx",
  "md",
  "nz",
  "pt",
  "ru",
  "ro",
  "si",
  "us",
  "hr",
  "ch",
  "za",
  "jp",
  "uy",
  "fr",
];

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  for (const iso of ISO_CODES) {
    const url = `https://flagcdn.com/w320/${iso}.png`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`${iso}: HTTP ${res.status}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(path.join(OUT, `${iso}.png`), buf);
    process.stdout.write(`${iso} `);
  }
  console.log(`\nOK: ${ISO_CODES.length} files -> ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

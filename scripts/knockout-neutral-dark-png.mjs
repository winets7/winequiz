/**
 * Делает прозрачными тёмные почти-серые пиксели (типичный фон экспорта без альфы),
 * не затрагивая тёмную древесину с явным коричневым оттенком (каналы отличаются).
 *
 * node scripts/knockout-neutral-dark-png.mjs [путь-к-png]
 */
import fs from "fs";
import sharp from "sharp";

const target = process.argv[2] ?? "public/ui/active_games.png";
const maxLum = Number(process.argv[3] ?? 44);
const maxRange = Number(process.argv[4] ?? 26);

const { data, info } = await sharp(target).ensureAlpha().raw().toBuffer({
  resolveWithObject: true,
});
const ch = info.channels;
for (let i = 0; i < data.length; i += ch) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const mn = Math.min(r, g, b);
  const mx = Math.max(r, g, b);
  const lum = (r + g + b) / 3;
  if (lum <= maxLum && mx - mn <= maxRange) {
    data[i + 3] = 0;
  }
}

const png = await sharp(data, {
  raw: { width: info.width, height: info.height, channels: 4 },
}).png().toBuffer();
fs.writeFileSync(target, png);
console.error(`OK ${target} (${png.length} bytes)`);

import sharp from "sharp";
import { mkdirSync, copyFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const repoRoot = path.join(root, "..");
const src512 = path.join(repoRoot, "public", "icons", "icon-512x512.png");

if (!existsSync(src512)) {
  console.error("Missing", src512);
  process.exit(1);
}

const res = path.join(root, "android", "app", "src", "main", "res");
const sizes = {
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192,
};

for (const [folder, size] of Object.entries(sizes)) {
  const dir = path.join(res, folder);
  mkdirSync(dir, { recursive: true });
  const out = path.join(dir, "ic_launcher.png");
  const outRound = path.join(dir, "ic_launcher_round.png");
  const outFg = path.join(dir, "ic_launcher_foreground.png");
  const buf = await sharp(src512).resize(size, size).png().toBuffer();
  await sharp(buf).toFile(out);
  await sharp(buf).toFile(outRound);
  await sharp(buf).toFile(outFg);
}

mkdirSync(path.join(res, "drawable"), { recursive: true });
copyFileSync(src512, path.join(res, "drawable", "splash.png"));

console.log("Android launcher icons updated from PWA icon-512x512.png");

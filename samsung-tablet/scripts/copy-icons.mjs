import sharp from "sharp";
import { mkdirSync, existsSync } from "fs";
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

/** Legacy launcher icon (px per density). */
const launcherSizes = {
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192,
};

/** Adaptive foreground canvas = 108dp; logo ~62% for safe zone. */
const fgScales = {
  "mipmap-mdpi": 1,
  "mipmap-hdpi": 1.5,
  "mipmap-xhdpi": 2,
  "mipmap-xxhdpi": 3,
  "mipmap-xxxhdpi": 4,
};

const BG = { r: 114, g: 47, b: 55, alpha: 1 };

async function writeLauncherIcon(dir, size) {
  mkdirSync(dir, { recursive: true });
  const buf = await sharp(src512)
    .resize(size, size, { fit: "contain", background: BG })
    .png()
    .toBuffer();
  await sharp(buf).toFile(path.join(dir, "ic_launcher.png"));
  await sharp(buf).toFile(path.join(dir, "ic_launcher_round.png"));
}

async function writeAdaptiveForeground(dir, scale) {
  const canvas = Math.round(108 * scale);
  const logo = Math.round(canvas * 0.62);
  const left = Math.floor((canvas - logo) / 2);
  const top = left;

  const logoBuf = await sharp(src512)
    .resize(logo, logo, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const fg = await sharp({
    create: {
      width: canvas,
      height: canvas,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: logoBuf, left, top }])
    .png()
    .toBuffer();

  await sharp(fg).toFile(path.join(dir, "ic_launcher_foreground.png"));
}

for (const [folder, size] of Object.entries(launcherSizes)) {
  const dir = path.join(res, folder);
  await writeLauncherIcon(dir, size);
  await writeAdaptiveForeground(dir, fgScales[folder]);
}

mkdirSync(path.join(res, "drawable"), { recursive: true });
await sharp(src512)
  .resize(512, 512, { fit: "contain", background: BG })
  .png()
  .toFile(path.join(res, "drawable", "splash.png"));

console.log("Launcher + adaptive foreground icons updated from PWA icon-512x512.png");

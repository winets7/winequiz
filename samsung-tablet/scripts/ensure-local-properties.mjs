import { existsSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const out = path.join(root, "android", "local.properties");

const candidates = [
  process.env.ANDROID_HOME,
  process.env.ANDROID_SDK_ROOT,
  "C:\\Users\\Vladislav\\AppData\\Local\\Android\\Sdk",
].filter(Boolean);

const sdk = candidates.find((p) => existsSync(p));
if (!sdk) {
  console.error("Android SDK not found. Set ANDROID_HOME or install SDK.");
  process.exit(1);
}

const escaped = sdk.replace(/\\/g, "\\\\");
writeFileSync(out, `sdk.dir=${escaped}\n`, "utf8");
console.log("sdk.dir =", sdk);

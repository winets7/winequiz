import { execSync } from "child_process";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const apk = path.join(
  root,
  "android",
  "app",
  "build",
  "outputs",
  "apk",
  "release",
  "app-release.apk",
);

if (!existsSync(apk)) {
  console.error("APK not found. Run: npm run android:release");
  process.exit(1);
}

const adb =
  process.env.ADB_PATH ||
  "C:\\Users\\Vladislav\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe";

const remote = "/data/local/tmp/vintaste-tablet.apk";
execSync(`"${adb}" push "${apk}" ${remote}`, { stdio: "inherit", shell: true });
execSync(`"${adb}" shell pm install -r ${remote}`, { stdio: "inherit", shell: true });
console.log("Installed", apk);

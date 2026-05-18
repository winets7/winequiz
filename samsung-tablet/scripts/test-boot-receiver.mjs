import { execSync } from "child_process";

const adb =
  process.env.ADB_PATH ||
  "C:\\Users\\Vladislav\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe";
const pkg = "ru.vintaste.winequiz";

execSync(`"${adb}" shell am broadcast -a android.intent.action.BOOT_COMPLETED -p ${pkg}`, {
  stdio: "inherit",
  shell: true,
});
console.log("BOOT_COMPLETED sent to", pkg, "(app should open in ~12s)");

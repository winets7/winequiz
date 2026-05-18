import { execSync } from "child_process";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const keystoreDir = path.join(root, "android-signing");
const keystoreFile = path.join(keystoreDir, "release.keystore");
const propsFile = path.join(keystoreDir, "keystore.properties");

const storePassword = "vintasteTablet2026";
const keyAlias = "vintaste-tablet";
const keyPassword = storePassword;

if (!existsSync(keystoreDir)) {
  mkdirSync(keystoreDir, { recursive: true });
}

if (!existsSync(keystoreFile)) {
  const dname =
    "CN=Vintaste Wine Quiz Tablet, OU=Mobile, O=Vintaste, L=RU, ST=RU, C=RU";
  const cmd = `keytool -genkeypair -v -keystore "${keystoreFile}" -alias ${keyAlias} -keyalg RSA -keysize 2048 -validity 10000 -storepass ${storePassword} -keypass ${keyPassword} -dname "${dname}"`;
  execSync(cmd, { stdio: "inherit", shell: true });
  console.log("Created", keystoreFile);
}

const props = `storePassword=${storePassword}
keyAlias=${keyAlias}
keyPassword=${keyPassword}
`;

writeFileSync(propsFile, props, "utf8");
console.log("Keystore properties ready at", propsFile);

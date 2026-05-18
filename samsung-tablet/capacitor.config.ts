import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "ru.vintaste.winequiz",
  appName: "Винная Викторина",
  webDir: "www",
  server: {
    url: "https://vintaste.ru",
    androidScheme: "https",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#722F37",
  },
};

export default config;

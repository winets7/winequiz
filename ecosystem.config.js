module.exports = {
  apps: [
    {
      name: "winequiz-web",
      cwd: "/var/www/winequiz",
      script: "node_modules/.bin/next",
      args: "start -p 3000",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "winequiz-socket",
      cwd: "/var/www/winequiz",
      script: "node_modules/.bin/tsx",
      args: "server/socket/index.ts",
      env: {
        NODE_ENV: "production",
        SOCKET_PORT: 3001,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "https://www.vintaste.ru",
      },
    },
  ],
};

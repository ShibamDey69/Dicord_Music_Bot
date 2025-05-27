module.exports = {
    apps: [
      {
        name: "discord-bot",
        script: "./src/index.js",
        interpreter: "bun",
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
        env: {
          NODE_ENV: "development",
        },
      },
    ],
  };
  
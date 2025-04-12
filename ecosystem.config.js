// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "whatsapp-api",
      script: "./app.js",
      watch: false,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};

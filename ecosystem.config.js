module.exports = {
  apps: [
    {
      name: "blacksight-backend",
      script: "dist/src/main.js",
      instances: 2, // Adjust as needed
      exec_mode: "cluster", // Enables load balancing
      env: {
        NODE_ENV: "development",
        PORT: 5000,
      },
      env_staging: {
        NODE_ENV: "staging",
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 5000,
      },
    },
  ],
};

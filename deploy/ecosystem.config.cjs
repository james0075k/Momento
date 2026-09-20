// PM2 process file for the Momento API on the Hostinger VPS.
// Started by deploy/remote-release.sh; APP_DIR is the folder that holds releases/, shared/ and current.
const appDir = process.env.APP_DIR || "/var/www/momento-api";

module.exports = {
  apps: [
    {
      name: "momento-api",
      script: "dist/server.js",
      cwd: `${appDir}/current/apps/api`,
      // Secrets live in shared/.env (linked into each release), never in git.
      node_args: "--env-file=../../.env",
      // One instance: the rate limiter keeps its counters in memory.
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "400M",
      // src/server.ts closes the server on SIGINT/SIGTERM and force-exits after 10 seconds.
      kill_timeout: 12000,
      env: { NODE_ENV: "production" },
    },
  ],
};

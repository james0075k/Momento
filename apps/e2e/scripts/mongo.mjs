// A throwaway MongoDB for the end-to-end run. Playwright starts it and stops it.
// Its files live in one fixed folder that is emptied at every start. Playwright ends this process
// without letting it clean up, so a fresh temporary folder per run would leave ~300 MB behind each time.
import { mkdirSync, rmSync } from "node:fs";
import { MongoMemoryServer } from "mongodb-memory-server";

const port = Number(process.env.E2E_MONGO_PORT ?? 27117);
const dbPath = new URL("../.mongo-e2e", import.meta.url);
rmSync(dbPath, { recursive: true, force: true });
mkdirSync(dbPath, { recursive: true });

const mongod = await MongoMemoryServer.create({
  instance: {
    port,
    dbPath: dbPath.pathname.replace(/^\/([A-Za-z]:)/, "$1"),
    storageEngine: "wiredTiger",
  },
});
console.log(`E2E MongoDB ready at ${mongod.getUri()}`);

const stop = async () => {
  await mongod.stop();
  process.exit(0);
};
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
setInterval(() => {}, 1 << 30);

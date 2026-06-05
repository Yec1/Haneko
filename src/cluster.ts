import { ClusterManager, HeartbeatManager } from "discord-hybrid-sharding";
import dotenv from "dotenv";
import { join } from "path";
import { Logger } from "./utils/Logger.js";

dotenv.config();

const isDev = process.env.NODE_ENV === "development";
const token = isDev ? process.env.TEST_DISCORD_TOKEN : process.env.DISCORD_TOKEN;

if (!token) {
  console.error(`❌ ${isDev ? "TEST_DISCORD_TOKEN" : "DISCORD_TOKEN"} is not set`);
  process.exit(1);
}

const isCompiled = __filename.endsWith(".js");
const manager = new ClusterManager(
  join(__dirname, isCompiled ? "index.js" : "index.ts"),
  {
    totalShards: "auto",
    totalClusters: "auto",
    mode: "process",
    token,
    restarts: { max: 5, interval: 1000 * 60 * 60 * 2 },
    execArgv: isCompiled ? [] : ["-r", "tsx/cjs"],
  }
);

manager.extend(
  new HeartbeatManager({ interval: 2000, maxMissedHeartbeats: 5 })
);

const logger = new Logger("Cluster");

manager.on("clusterCreate", (cluster) => {
  cluster.on("ready", () => {
    logger.success(`Launched Cluster #${cluster.id}`);
  });
  cluster.on("reconnecting", () => {
    logger.info(`Reconnecting Cluster #${cluster.id}`);
  });
  cluster.on("death", () => {
    logger.info(`Restarting Cluster #${cluster.id}`);
    manager.recluster?.start();
  });
});

process.on("uncaughtException", (e) => { try { logger.error(`Uncaught: ${e}`); } catch {} });
process.on("unhandledRejection", (r) => { try { logger.error(`Rejection: ${r}`); } catch {} });

(async () => {
  try {
    await manager.spawn({ timeout: -1 });
  } catch (e) {
    logger.error(`Failed to spawn: ${e}`);
    process.exit(1);
  }
})();

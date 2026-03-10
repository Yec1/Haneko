import dotenv from "dotenv";
import fs from "fs";
Object.assign(process.env, dotenv.parse(fs.readFileSync("./.env")));

import { ClusterManager, HeartbeatManager } from "discord-hybrid-sharding";
import { Logger } from "./services/logger.js";

const manager = new ClusterManager(`${process.cwd()}/dist/index.js`, {
	totalShards: "auto",
	totalClusters: "auto",
	mode: "worker",
	token:
		process.env.NODE_ENV === "dev"
			? process.env.TESTOKEN!
			: process.env.TOKEN!,
	restarts: {
		max: 5,
		interval: 1000 * 60 * 60 * 2
	}
});

manager.extend(
	new HeartbeatManager({
		interval: 2000,
		maxMissedHeartbeats: 5
	})
);

manager.on("clusterCreate", cluster => {
	cluster.on("ready", () => {
		new Logger("分片").info(`已啟動 Cluster #${cluster.id}`);
		setInterval(
			() => {
				const memory = process.memoryUsage();
				new Logger("系統").info(
					`[Cluster #${cluster.id}] RSS: ${(memory.rss / 1024 / 1024).toFixed(2)}MB, Heap: ${(memory.heapUsed / 1024 / 1024).toFixed(2)}MB`
				);
			},
			1000 * 60 * 10
		);
	});

	cluster.on("reconnecting", () => {
		new Logger("分片").info(`重新連接集群 #${cluster.id} 至 Discord WS`);
	});

	cluster.on("death", () => {
		new Logger("分片").info(`重新聚類集群 ${cluster.id}`);
		manager.recluster?.start();
	});
});

process.on("uncaughtException", error => {
	try {
		new Logger("集群").error(`未捕獲的異常: ${error}`);
	} catch {}
});

process.on("unhandledRejection", reason => {
	try {
		new Logger("集群").error(`未處理的Promise拒絕: ${reason}`);
	} catch {}
});

(async () => {
	try {
		await manager.spawn({ timeout: -1 });
	} catch (error) {
		new Logger("集群").error(`啟動集群失敗: ${error}`);
		process.exit(1);
	}
})();

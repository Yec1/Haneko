import { client, cluster, nhentai } from "../index.js";
import { Events, ActivityType } from "discord.js";
import { Logger } from "../services/logger.js";

async function updatePresence(): Promise<void> {
	const results = await cluster.broadcastEval(
		(c: any) => c.guilds.cache.size
	);
	const totalGuilds = results.reduce(
		(prev: number, val: number) => prev + val,
		0
	);

	client.user?.setPresence({
		activities: [
			{
				name: `${totalGuilds} 個伺服器`,
				type: ActivityType.Watching
			}
		],
		status: "online"
	});
}

async function updateCookie(): Promise<void> {
	new Logger("系統").success(`正在刷新 nhentai cookie...`);
	await nhentai.getRandom();
}

client.on(Events.ClientReady, async () => {
	new Logger("系統").success(`${client.user?.tag} 已經上線！`);
	setInterval(updatePresence, 10000);
	setInterval(updateCookie, 20 * 60 * 1000);
});

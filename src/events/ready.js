import { client } from "../index.js";
import { Events, ActivityType } from "discord.js";
import { Logger } from "../services/logger.js";
import { NHentai } from "@shineiichijo/nhentai-ts";
const nhentai = new NHentai({
	site: "nhentai.net",
	user_agent: process.env.USER_AGENT,
	cookie_value: process.env.COOKIE
});

async function updatePresence() {
	const results = await client.cluster.broadcastEval(
		c => c.guilds.cache.size
	);
	const totalGuilds = results.reduce((prev, val) => prev + val, 0);

	client.user.setPresence({
		activities: [
			{
				name: `${totalGuilds} 個伺服器`,
				type: ActivityType.Watching
			}
		],
		status: "online"
	});
}

async function updateCookie() {
	new Logger("系統").success(`正在刷新 nhentai cookie...`);
	await nhentai.getRandom();
}

client.on(Events.ClientReady, async () => {
	new Logger("系統").success(`${client.user.tag} 已經上線！`);
	setInterval(updatePresence, 10000);
	setInterval(updateCookie, 20 * 60 * 1000);
});

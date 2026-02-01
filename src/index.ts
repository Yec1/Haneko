import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname } from "path";

dotenv.config();

import {
	Client,
	GatewayIntentBits,
	Partials,
	Collection,
	ApplicationCommandType
} from "discord.js";
import { ClusterClient, getInfo } from "discord-hybrid-sharding";
import { QuickDB } from "quick.db";
import { NHentai } from "@yeci226/nhentai-ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Types
import type { MessageCommand, SlashCommand } from "./types/index.js";

// Services
import { Logger } from "./services/logger.js";
import { getAllFiles } from "./services/index.js";

/**
 * @description Discord 客戶端
 */
const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
	partials: [
		Partials.Channel,
		Partials.Message,
		Partials.User,
		Partials.GuildMember,
		Partials.Reaction
	],
	allowedMentions: {
		parse: ["users"],
		repliedUser: false
	},
	shards: getInfo().SHARD_LIST,
	shardCount: getInfo().TOTAL_SHARDS
});

const nhentai = new NHentai({
	site: "nhentai.website",
	...(process.env.USER_AGENT && { user_agent: process.env.USER_AGENT }),
	...(process.env.COOKIE && { cookie_value: process.env.COOKIE })
});

/**
 * @description 集群客戶端
 */
const cluster = new ClusterClient(client);

/**
 * @description 資料庫
 */
const database = new QuickDB();

/**
 * @description 指令集合
 */
const commands = {
	slash: new Collection<string, SlashCommand>(),
	message: new Collection<string, MessageCommand>()
};

/**
 * @description 載入指令和事件
 */
async function loadCommandsAndEvents() {
	const logger = new Logger("載入器");

	try {
		// 載入斜線指令
		const slashCommandPaths = await getAllFiles(`${__dirname}/commands`, [
			".js"
		]);
		const slashCommands = await loadSlashCommands(slashCommandPaths);

		// 載入事件
		const eventPaths = await getAllFiles(`${__dirname}/events`, [".js"]);
		await bindEvents(eventPaths);

		logger.success(
			`已載入 ${eventPaths.length} 事件、${slashCommands.length} 斜線指令`
		);

		return slashCommands;
	} catch (error) {
		logger.error(`載入失敗: ${(error as Error).message}`);
		throw error;
	}
}

/**
 * @description 載入斜線指令
 */
async function loadSlashCommands(paths: string[]) {
	const result: any[] = [];

	for (const path of paths) {
		try {
			const fileUrl = `file://${path}`;
			const file = (await import(fileUrl))?.default;

			if (file?.data && file?.execute) {
				commands.slash.set(file.data.name, file);

				// 處理特殊指令類型
				if (
					file.type === ApplicationCommandType.Message ||
					file.type === ApplicationCommandType.User
				) {
					delete file.description;
				}

				result.push(file.data);
			} else {
				new Logger("載入器").warn(
					`${path} 缺少必要的 data 或 execute 屬性`
				);
			}
		} catch (error) {
			new Logger("載入器").error(
				`載入指令 ${path} 失敗: ${(error as Error).message}`
			);
		}
	}

	return result;
}

/**
 * @description 綁定事件
 */
async function bindEvents(paths: string[]) {
	for (const path of paths) {
		try {
			const fileUrl = `file://${path}`;
			await import(fileUrl);
		} catch (error) {
			new Logger("載入器").error(
				`載入事件 ${path} 失敗: ${(error as Error).message}`
			);
		}
	}
}

/**
 * @description 初始化應用程式
 */
async function initialize() {
	try {
		const slashCommands = await loadCommandsAndEvents();

		// 設置斜線指令
		client.on("ready", async () => {
			await client.application?.commands.set(slashCommands);
			new Logger("系統").success("Discord 機器人已準備就緒");
		});
	} catch (error) {
		new Logger("系統").error(`初始化失敗: ${(error as Error).message}`);
		process.exit(1);
	}
}

// 啟動機器人
client.login(
	process.env.NODE_ENV === "dev" ? process.env.TEST_TOKEN : process.env.TOKEN
);

initialize();

export { client, database, cluster, commands, nhentai };

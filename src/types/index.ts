import {
	Client,
	Collection,
	ApplicationCommandData,
	Message,
	ChatInputCommandInteraction,
	SlashCommandBuilder
} from "discord.js";
import { ClusterClient } from "discord-hybrid-sharding";
import { QuickDB } from "quick.db";

export type MessageCommand = {
	name: string;
	description: string;
	usage?: string;
	aliases?: string[];
	category?: string;
	cooldown?: number;
	args?: boolean;
	guildOnly?: boolean;

	/**
	 * @param message - 消息
	 * @param _args - 參數
	 * @returns
	 */
	execute: (message: Message, ..._args: string[]) => Promise<any>;
};

export type SlashCommand = {
	data: SlashCommandBuilder;

	/**
	 * @param interaction - 互動實例
	 * @param _args - 參數
	 * @returns
	 */
	execute: (
		interaction: ChatInputCommandInteraction,
		..._args: string[]
	) => Promise<any>;
};

// 擴展 Discord.js Client 類型
declare module "discord.js" {
	interface Client {
		db: QuickDB;
		cluster: ClusterClient<Client>;
		commands: {
			slash: Collection<string, CommandData>;
			message: Collection<string, any>;
		};
		loader: Loader;
	}
}

// 命令數據接口
export interface CommandData {
	data: ApplicationCommandData;
	execute: (interaction: any) => Promise<void>;
}

// 載入器類接口
export interface Loader {
	client: Client;
	logger: Logger;
	loadedModules: Set<string>;
	slashCommands?: ApplicationCommandData[];
	load(): Promise<void>;
	loadEvents(): Promise<void>;
	loadCommands(): Promise<void>;
	registerCommands(): Promise<void>;
	cleanup(): void;
	getStats(): { loadedModules: number; cacheStats: any };
}

// 日誌器接口
export interface Logger {
	info(message: string): void;
	success(message: string): void;
	warn(message: string): void;
	error(message: string): void;
}

// 快取服務接口
export interface CacheService {
	get(key: string): any;
	set(key: string, value: any, ttl?: number): void;
	delete(key: string): void;
	cleanup(): void;
	getStats(): any;
}

// 配置接口
export interface Config {
	[key: string]: any;
}

// 數據庫接口
export interface Database {
	[key: string]: any;
}

// 性能監控接口
export interface Performance {
	[key: string]: any;
}

// 國際化接口
export interface I18n {
	[key: string]: any;
}

// 書籍服務接口
export interface BookService {
	[key: string]: any;
}

// 工具函數接口
export interface Utils {
	[key: string]: any;
}

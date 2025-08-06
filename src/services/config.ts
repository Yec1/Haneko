import { Logger } from "./logger.js";

interface ConfigData {
	[key: string]: any;
}

class ConfigService {
	private config: ConfigData;
	private logger: Logger;

	constructor() {
		this.config = {};
		this.logger = new Logger("配置服務");
	}

	// 載入配置
	load(config: ConfigData): void {
		this.config = { ...this.config, ...config };
		this.logger.info("配置已載入");
	}

	// 取得配置值
	get(key: string, defaultValue?: any): any {
		return this.config[key] ?? defaultValue;
	}

	// 設定配置值
	set(key: string, value: any): void {
		this.config[key] = value;
	}

	// 取得所有配置
	getAll(): ConfigData {
		return { ...this.config };
	}

	// 檢查配置是否存在
	has(key: string): boolean {
		return key in this.config;
	}

	// 移除配置
	remove(key: string): void {
		delete this.config[key];
	}

	// 清空配置
	clear(): void {
		this.config = {};
		this.logger.info("配置已清空");
	}
}

export default new ConfigService();

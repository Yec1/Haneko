import fs from "fs";
import path from "path";

interface LogLevels {
	error: number;
	warn: number;
	info: number;
	debug: number;
}

interface LogStats {
	totalFiles: number;
	totalSize: number;
	oldestFile?: string | undefined;
	newestFile?: string | undefined;
}

export class Logger {
	private name: string;
	private logLevels: LogLevels;
	private currentLevel: string;
	private logDirectory: string;
	private maxLogFiles: number;
	private maxLogSize: number;

	constructor(name = "Logger") {
		this.name = name;
		this.logLevels = {
			error: 0,
			warn: 1,
			info: 2,
			debug: 3
		};
		this.currentLevel = process.env.LOG_LEVEL || "info";
		this.logDirectory = process.env.LOG_DIRECTORY || "./logs";
		this.maxLogFiles = parseInt(process.env.LOG_MAX_FILES || "10");
		this.maxLogSize = parseInt(process.env.LOG_MAX_SIZE || "10485760"); // 10MB

		this.ensureLogDirectory();
	}

	// 確保日誌目錄存在
	private ensureLogDirectory(): void {
		if (!fs.existsSync(this.logDirectory)) {
			fs.mkdirSync(this.logDirectory, { recursive: true });
		}
	}

	// 格式化時間戳
	private formatTimestamp(): string {
		const now = new Date();
		return now.toISOString();
	}

	// 格式化日誌訊息
	private formatMessage(
		level: string,
		message: string,
		data: any = null
	): string {
		const timestamp = this.formatTimestamp();
		const baseMessage = `[${timestamp}] [${level.toUpperCase()}] [${this.name}] ${message}`;

		if (data) {
			return `${baseMessage} ${JSON.stringify(data)}`;
		}

		return baseMessage;
	}

	// 寫入檔案日誌
	private writeToFile(
		level: string,
		message: string,
		data: any = null
	): void {
		try {
			const today = new Date().toISOString().split("T")[0];
			const logFile = path.join(this.logDirectory, `${today}.log`);

			const formattedMessage = this.formatMessage(level, message, data);
			const logEntry = `${formattedMessage}\n`;

			fs.appendFileSync(logFile, logEntry);

			// 檢查檔案大小並輪換
			this.rotateLogFile(logFile);
		} catch (error) {
			console.error(`寫入日誌檔案失敗: ${(error as Error).message}`);
		}
	}

	// 日誌檔案輪換
	private rotateLogFile(logFile: string): void {
		try {
			const stats = fs.statSync(logFile);
			if (stats.size > this.maxLogSize) {
				const backupFile = `${logFile}.${Date.now()}`;
				fs.renameSync(logFile, backupFile);

				// 清理舊的備份檔案
				this.cleanupOldLogs();
			}
		} catch (error) {
			// 檔案不存在或其他錯誤，忽略
		}
	}

	// 清理舊日誌檔案
	private cleanupOldLogs(): void {
		try {
			const files = fs.readdirSync(this.logDirectory);
			const logFiles = files.filter(file => file.endsWith(".log"));

			if (logFiles.length > this.maxLogFiles) {
				// 按修改時間排序
				const sortedFiles = logFiles
					.map(file => ({
						name: file,
						path: path.join(this.logDirectory, file),
						mtime: fs.statSync(path.join(this.logDirectory, file))
							.mtime
					}))
					.sort((a, b) => a.mtime.getTime() - b.mtime.getTime());

				// 刪除最舊的檔案
				const filesToDelete = sortedFiles.slice(
					0,
					sortedFiles.length - this.maxLogFiles
				);

				filesToDelete.forEach(file => {
					try {
						fs.unlinkSync(file.path);
					} catch (error) {
						console.error(`刪除日誌檔案失敗: ${file.name}`);
					}
				});
			}
		} catch (error) {
			console.error(`清理舊日誌檔案失敗: ${(error as Error).message}`);
		}
	}

	// 檢查是否應該記錄此級別的日誌
	private shouldLog(level: string): boolean {
		const currentLevelNum =
			this.logLevels[this.currentLevel as keyof LogLevels] || 2;
		const messageLevelNum = this.logLevels[level as keyof LogLevels] || 2;
		return messageLevelNum <= currentLevelNum;
	}

	// 記錄錯誤日誌
	error(message: string, data: any = null): void {
		if (this.shouldLog("error")) {
			const formattedMessage = this.formatMessage("error", message, data);
			console.error(formattedMessage);
			this.writeToFile("error", message, data);
		}
	}

	// 記錄警告日誌
	warn(message: string, data: any = null): void {
		if (this.shouldLog("warn")) {
			const formattedMessage = this.formatMessage("warn", message, data);
			console.warn(formattedMessage);
			this.writeToFile("warn", message, data);
		}
	}

	// 記錄信息日誌
	info(message: string, data: any = null): void {
		if (this.shouldLog("info")) {
			const formattedMessage = this.formatMessage("info", message, data);
			console.info(formattedMessage);
			this.writeToFile("info", message, data);
		}
	}

	// 記錄調試日誌
	debug(message: string, data: any = null): void {
		if (this.shouldLog("debug")) {
			const formattedMessage = this.formatMessage("debug", message, data);
			console.debug(formattedMessage);
			this.writeToFile("debug", message, data);
		}
	}

	// 記錄成功日誌
	success(message: string, data: any = null): void {
		if (this.shouldLog("info")) {
			const formattedMessage = this.formatMessage(
				"success",
				message,
				data
			);
			console.log(`\x1b[32m${formattedMessage}\x1b[0m`); // 綠色文字
			this.writeToFile("success", message, data);
		}
	}

	// 設置日誌級別
	setLevel(level: string): void {
		if (this.logLevels.hasOwnProperty(level)) {
			this.currentLevel = level;
			this.info(`日誌級別已更改為: ${level}`);
		} else {
			this.warn(`無效的日誌級別: ${level}`);
		}
	}

	// 獲取日誌統計信息
	getLogStats(): LogStats {
		try {
			const files = fs.readdirSync(this.logDirectory);
			const logFiles = files.filter(file => file.endsWith(".log"));

			let totalSize = 0;
			const fileStats: { name: string; size: number; mtime: Date }[] = [];

			logFiles.forEach(file => {
				const filePath = path.join(this.logDirectory, file);
				const stats = fs.statSync(filePath);
				totalSize += stats.size;
				fileStats.push({
					name: file,
					size: stats.size,
					mtime: stats.mtime
				});
			});

			// 按修改時間排序
			fileStats.sort((a, b) => a.mtime.getTime() - b.mtime.getTime());

			return {
				totalFiles: logFiles.length,
				totalSize,
				oldestFile: fileStats[0]?.name,
				newestFile: fileStats[fileStats.length - 1]?.name
			};
		} catch (error) {
			this.error(`獲取日誌統計失敗: ${(error as Error).message}`);
			return {
				totalFiles: 0,
				totalSize: 0
			};
		}
	}

	// 格式化檔案大小
	private formatFileSize(bytes: number): string {
		const sizes = ["Bytes", "KB", "MB", "GB"];
		if (bytes === 0) return "0 Bytes";
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return (
			Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
		);
	}

	// 清理所有日誌檔案
	clearLogs(): void {
		try {
			const files = fs.readdirSync(this.logDirectory);
			const logFiles = files.filter(file => file.endsWith(".log"));

			logFiles.forEach(file => {
				const filePath = path.join(this.logDirectory, file);
				fs.unlinkSync(filePath);
			});

			this.info(`已清理 ${logFiles.length} 個日誌檔案`);
		} catch (error) {
			this.error(`清理日誌檔案失敗: ${(error as Error).message}`);
		}
	}
}

// 服務模組匯出
export { default as configService } from "./config.js";
export { default as databaseService } from "./database.js";
export { default as cacheService } from "./cache.js";
export { Logger } from "./logger.js";

import { join, extname } from "path";
import { readdir } from "fs/promises";

/**
 * @description 獲取指定目錄下的所有 .js 文件
 * @param dir - 目錄路徑
 * @param exts - 可接受的文件擴展名
 * @returns 所有 .js 文件的路徑
 */
export async function getAllFiles(dir: string, exts: string[]) {
	let files: string[] = [];

	const entries = await readdir(dir, { withFileTypes: true });

	for (const entry of entries) {
		const fullPath = join(dir, entry.name);
		if (entry.isDirectory()) {
			files = files.concat(await getAllFiles(fullPath, exts));
		} else if (exts.includes(extname(entry.name))) {
			files.push(fullPath);
		}
	}

	return files;
}

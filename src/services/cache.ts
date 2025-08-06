import { Logger } from "./logger.js";

interface CacheItem {
	value: any;
	expiry: number;
	accessed: number;
}

interface CacheStats {
	total: number;
	valid: number;
	expired: number;
	maxSize: number;
}

class CacheService {
	private cache: Map<string, CacheItem>;
	private logger: Logger;
	private maxSize: number;
	private defaultTTL: number;

	constructor() {
		this.cache = new Map();
		this.logger = new Logger("快取服務");
		this.maxSize = 1000; // 最大快取條目數
		this.defaultTTL = 300000; // 預設5分鐘TTL
	}

	// 設定快取
	set(key: string, value: any, ttl: number = this.defaultTTL): void {
		// 檢查快取大小
		if (this.cache.size >= this.maxSize) {
			this.evictOldest();
		}

		const expiry = Date.now() + ttl;
		this.cache.set(key, {
			value,
			expiry,
			accessed: Date.now()
		});
	}

	// 取得快取
	get(key: string): any {
		const item = this.cache.get(key);

		if (!item) {
			return null;
		}

		// 檢查是否過期
		if (Date.now() > item.expiry) {
			this.cache.delete(key);
			return null;
		}

		// 更新存取時間
		item.accessed = Date.now();
		return item.value;
	}

	// 檢查快取是否存在
	has(key: string): boolean {
		const item = this.cache.get(key);
		if (!item) return false;

		if (Date.now() > item.expiry) {
			this.cache.delete(key);
			return false;
		}

		return true;
	}

	// 刪除快取
	delete(key: string): boolean {
		return this.cache.delete(key);
	}

	// 清空快取
	clear(): void {
		this.cache.clear();
		this.logger.info("快取已清空");
	}

	// 取得快取統計
	getStats(): CacheStats {
		const now = Date.now();
		let validEntries = 0;
		let expiredEntries = 0;

		for (const [key, item] of this.cache) {
			if (now > item.expiry) {
				expiredEntries++;
				this.cache.delete(key);
			} else {
				validEntries++;
			}
		}

		return {
			total: this.cache.size,
			valid: validEntries,
			expired: expiredEntries,
			maxSize: this.maxSize
		};
	}

	// 驅逐最舊的條目
	private evictOldest(): void {
		let oldestKey: string | null = null;
		let oldestTime = Date.now();

		for (const [key, item] of this.cache) {
			if (item.accessed < oldestTime) {
				oldestTime = item.accessed;
				oldestKey = key;
			}
		}

		if (oldestKey) {
			this.cache.delete(oldestKey);
		}
	}

	// 清理過期條目
	cleanup(): void {
		const now = Date.now();
		let cleanedCount = 0;

		for (const [key, item] of this.cache) {
			if (now > item.expiry) {
				this.cache.delete(key);
				cleanedCount++;
			}
		}

		if (cleanedCount > 0) {
			this.logger.info(`清理了 ${cleanedCount} 個過期快取條目`);
		}
	}

	// 設定快取大小限制
	setMaxSize(size: number): void {
		this.maxSize = size;
		while (this.cache.size > this.maxSize) {
			this.evictOldest();
		}
	}

	// 取得快取大小
	getSize(): number {
		return this.cache.size;
	}
}

export default new CacheService(); 
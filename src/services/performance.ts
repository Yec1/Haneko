import { Logger } from "./logger.js";

interface PerformanceMetrics {
	cpu: number;
	memory: number;
	uptime: number;
	requests: number;
}

interface PerformanceReport {
	metrics: PerformanceMetrics;
	timestamp: Date;
}

class PerformanceMonitor {
	private logger: Logger;
	private isMonitoring: boolean;
	private startTime: number;
	private requestCount: number;

	constructor() {
		this.logger = new Logger("效能監控");
		this.isMonitoring = false;
		this.startTime = Date.now();
		this.requestCount = 0;
	}

	// 開始監控
	startMonitoring(): void {
		this.isMonitoring = true;
		this.startTime = Date.now();
		this.logger.info("效能監控已開始");
	}

	// 停止監控
	stopMonitoring(): void {
		this.isMonitoring = false;
		this.logger.info("效能監控已停止");
	}

	// 記錄請求
	recordRequest(): void {
		if (this.isMonitoring) {
			this.requestCount++;
		}
	}

	// 取得效能報告
	getPerformanceReport(): PerformanceReport {
		const uptime = Date.now() - this.startTime;
		const memory = process.memoryUsage();

		return {
			metrics: {
				cpu: process.cpuUsage().user / 1000000, // 轉換為秒
				memory: memory.heapUsed / 1024 / 1024, // 轉換為 MB
				uptime: uptime / 1000, // 轉換為秒
				requests: this.requestCount
			},
			timestamp: new Date()
		};
	}

	// 取得監控狀態
	isActive(): boolean {
		return this.isMonitoring;
	}

	// 重置統計
	reset(): void {
		this.startTime = Date.now();
		this.requestCount = 0;
		this.logger.info("效能統計已重置");
	}
}

export default new PerformanceMonitor();

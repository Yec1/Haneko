const LEVEL_COLORS: Record<string, string> = {
	info: "\x1b[36m",
	warn: "\x1b[33m",
	error: "\x1b[31m",
	success: "\x1b[32m",
	command: "\x1b[35m",
	debug: "\x1b[90m"
};

const RESET = "\x1b[0m";

export class Logger {
	private readonly scope: string;

	constructor(scope = "App") {
		this.scope = scope;
	}

	info(...args: unknown[]): void {
		this.write("info", args);
	}

	warn(...args: unknown[]): void {
		this.write("warn", args);
	}

	error(...args: unknown[]): void {
		this.write("error", args);
	}

	success(...args: unknown[]): void {
		this.write("success", args);
	}

	command(...args: unknown[]): void {
		this.write("command", args);
	}

	debug(...args: unknown[]): void {
		this.write("debug", args);
	}

	private write(level: string, args: unknown[]): void {
		const ts = new Date().toISOString();
		const color = LEVEL_COLORS[level] || "";
		const head = `${color}[${ts}] [${this.scope}] [${level.toUpperCase()}]${RESET}`;

		if (level === "error") {
			console.error(head, ...args);
			return;
		}

		if (level === "warn") {
			console.warn(head, ...args);
			return;
		}

		console.log(head, ...args);
	}
}

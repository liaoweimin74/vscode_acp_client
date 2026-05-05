export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
};

export interface LogOutput {
	appendLine(line: string): void;
	show?(): void;
	dispose?(): void;
}

export class Logger {
	private static instance: Logger | null = null;
	private channel: LogOutput;
	private level: LogLevel = "info";

	private constructor(channel?: LogOutput) {
		this.channel = channel ?? {
			appendLine: (line: string) => console.log(line),
		};
	}

	static getInstance(): Logger {
		if (!Logger.instance) {
			Logger.instance = new Logger();
		}
		return Logger.instance;
	}

	static init(channel: LogOutput): Logger {
		if (Logger.instance) {
			Logger.instance.dispose();
		}
		Logger.instance = new Logger(channel);
		return Logger.instance;
	}

	setLevel(level: LogLevel): void {
		this.level = level;
	}

	private shouldLog(level: LogLevel): boolean {
		return LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[this.level];
	}

	private log(level: LogLevel, message: string): void {
		if (!this.shouldLog(level)) return;
		const timestamp = new Date().toISOString();
		this.channel.appendLine(`[${timestamp}][ACP][${level.toUpperCase()}] ${message}`);
	}

	debug(message: string): void {
		this.log("debug", message);
	}

	info(message: string): void {
		this.log("info", message);
	}

	warn(message: string): void {
		this.log("warn", message);
	}

	error(message: string): void {
		this.log("error", message);
	}

	show(): void {
		this.channel.show?.();
	}

	dispose(): void {
		this.channel.dispose?.();
		Logger.instance = null;
	}
}

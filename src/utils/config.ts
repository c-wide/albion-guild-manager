import type { Level } from "pino";

export type Config = {
	logLevel: Level;
};

export const config = {
	logLevel: "info",
} as const satisfies Config;

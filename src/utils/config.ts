import type { Level } from "pino";

export const config = {
	logLevel: "info" satisfies Level,
	albionServerRegions: ["Americas", "Asia", "Europe"],
	supportDiscordURL: "https://discord.gg/x86PwqWtDv",
	colors: {
		default: "#1C1C1C",
		success: "#4BB543",
		info: "#248EFF",
		warning: "#EED202",
		error: "#FF3333",
	},
} as const;

export type AlbionServerRegion = (typeof config.albionServerRegions)[number];

import type { Level } from "pino";

export const config = {
	botName: "Albion Guild Manager",
	avatarURL: "https://github.com/shadcn.png",
	logLevel: "info" satisfies Level,
	albionServerRegions: ["Americas", "Asia", "Europe"],
	supportDiscordURL: "https://discord.gg/x86PwqWtDv",
} as const;

export type AlbionServerRegion = (typeof config.albionServerRegions)[number];

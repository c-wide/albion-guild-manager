import type { Level } from "pino";

export const config = {
	logLevel: "info" satisfies Level,
	guildChangeKeys: ["name", "nameAcronym", "iconURL", "bannerURL"],
	albionServerRegions: ["Americas", "Asia", "Europe"],
} as const;

export type AlbionServerRegion = (typeof config.albionServerRegions)[number];

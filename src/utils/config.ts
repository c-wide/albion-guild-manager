import type { Level } from "pino";

export const config = {
	logLevel: "info" satisfies Level,
	guildChangeKeys: ["name", "nameAcronym", "iconURL", "bannerURL"],
} as const;

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { i18n } from "i18next";
import type { Logger } from "pino";
import type { config } from "#src/utils/config.ts";
import type { GuildDetails } from "#src/utils/misc.ts";

declare module "discord.js" {
	export interface Client {
		config: typeof config;
		logger: Logger;
		i18n: i18n;
		db: PostgresJsDatabase;
		guildCache: Map<string, GuildDetails>;
	}
}

import { until } from "@open-draft/until";
import type { Collection, Guild } from "discord.js";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "~/database/db";
import { serverSettings, servers } from "~/database/schema";
import type { EventHandler, EventName } from "~/utils/event";
import { logger } from "~/utils/logger";
import {
	type GuildDetails,
	type SettingsKey,
	getShardId,
	guildCache,
} from "~/utils/misc";

export const name: EventName = "ready";
export const once = true;

export const handler: EventHandler<typeof name> = async (c) => {
	// Fetch guild details from DB for all guilds this shard will manage
	const storedGuilds = await getStoredGuilds(c.guilds.cache.map((g) => g.id));

	// Initial population of guild cache
	for (const [guildId, guild] of Object.entries(storedGuilds)) {
		guildCache.set(guildId, guild);
	}

	// Add new guilds to the DB and populate cache
	await addNewGuilds(storedGuilds, c.guilds.cache);

	logger.info({ shardId: getShardId(c) }, "Shard Ready");
};

async function getStoredGuilds(
	discordGuildIds: string[],
): Promise<Record<string, GuildDetails>> {
	const { error, data: guilds } = await until(() => {
		return db
			.select({
				id: servers.id,
				guildId: servers.guildId,
				key: serverSettings.key,
				value: serverSettings.value,
			})
			.from(servers)
			.where(
				and(inArray(servers.guildId, discordGuildIds), isNull(servers.leftAt)),
			)
			.leftJoin(serverSettings, eq(servers.id, serverSettings.serverId));
	});

	if (error) {
		logger.fatal(error, "Unable to fetch stored guilds");
		process.exit(1);
	}

	return guilds.reduce<Record<string, GuildDetails>>((acc, row) => {
		if (!acc[row.guildId]) {
			acc[row.guildId] = { id: row.id, settings: new Map() };
		}

		if (row.key) {
			acc[row.guildId].settings.set(
				row.key as SettingsKey,
				parseSettingValue(row.value),
			);
		}

		return acc;
	}, {});
}

function parseSettingValue(value: unknown): unknown {
	if (typeof value === "string" && value.startsWith("snowflake_")) {
		return value.substring(10);
	}

	return value;
}

async function addNewGuilds(
	storedGuilds: Record<string, GuildDetails>,
	currentGuilds: Collection<string, Guild>,
): Promise<void> {
	const guildsToAdd = currentGuilds.filter((cg) => !storedGuilds[cg.id]);

	if (guildsToAdd.size === 0) return;

	const { error, data: newGuilds } = await until(() => {
		return db
			.insert(servers)
			.values(
				guildsToAdd.map((g) => ({
					guildId: g.id,
				})),
			)
			.returning({
				id: servers.id,
				guildId: servers.guildId,
			});
	});

	if (error) {
		logger.fatal(error, "Unable to add new guilds");
		process.exit(1);
	}

	for (const guild of newGuilds) {
		guildCache.set(guild.guildId, {
			id: guild.id,
			settings: new Map(),
		});
	}

	logger.info({ guilds: newGuilds }, "Joined guilds while offline");
}

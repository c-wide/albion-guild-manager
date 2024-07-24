import { until } from "@open-draft/until";
import type { Collection, Guild } from "discord.js";
import { inArray, isNull } from "drizzle-orm";
import { db } from "~/database/db";
import { servers } from "~/database/schema";
import type { EventHandler, EventName } from "~/utils/event";
import { logger } from "~/utils/logger";
import { guildIdCache } from "~/utils/misc";

export const name: EventName = "ready";
export const once = true;

export const handler: EventHandler<typeof name> = async (c) => {
	const storedGuilds = await getStoredGuilds();

	addGuildsToCache(storedGuilds);

	await Promise.all([
		addNewGuilds(storedGuilds, c.guilds.cache),
		removeGuilds(storedGuilds, c.guilds.cache),
	]);

	// TODO: update changed guild settings
	// TODO: server ready? defer until server ready?

	logger.info(`Logged in as ${c.user.tag}!`);
};

type StoredGuild = typeof servers.$inferSelect;

async function getStoredGuilds(): Promise<StoredGuild[]> {
	const { error, data: guilds } = await until(() => {
		return db.select().from(servers).where(isNull(servers.leftAt));
	});

	if (error) {
		logger.fatal(error, "Unable to fetch stored guilds");
		process.exit(1);
	}

	return guilds;
}

function addGuildsToCache(guilds: { id: string; serverId: string }[]): void {
	for (const guild of guilds) {
		guildIdCache.set(guild.serverId, guild.id);
	}
}

function removeGuildsFromCache(
	guilds: { id: string; serverId: string }[],
): void {
	for (const guild of guilds) {
		guildIdCache.delete(guild.serverId);
	}
}

async function addNewGuilds(
	storedGuilds: StoredGuild[],
	currentGuilds: Collection<string, Guild>,
): Promise<void> {
	const guildsToAdd = currentGuilds.filter(
		(cg) => !storedGuilds.some((sg) => sg.serverId === cg.id),
	);

	if (guildsToAdd.size === 0) return;

	const { error, data: newGuilds } = await until(() => {
		return db
			.insert(servers)
			.values(
				guildsToAdd.map((g) => ({
					serverId: g.id,
					name: g.name,
					nameAcronym: g.nameAcronym,
					iconURL: g.iconURL(),
					bannerURL: g.bannerURL(),
					createdAt: g.createdAt,
				})),
			)
			.returning({
				id: servers.id,
				serverId: servers.serverId,
				name: servers.name,
			});
	});

	if (error) {
		logger.fatal(error, "Unable to add new guilds");
		process.exit(1);
	}

	logger.info({ guilds: newGuilds }, "Joined guilds while offline");
	addGuildsToCache(newGuilds);
}

async function removeGuilds(
	storedGuilds: StoredGuild[],
	currentGuilds: Collection<string, Guild>,
): Promise<void> {
	const guildsToRemove = storedGuilds.filter(
		(sg) => !currentGuilds.some((cg) => cg.id === sg.serverId),
	);

	if (guildsToRemove.length === 0) return;

	const { error } = await until(() => {
		return db
			.update(servers)
			.set({ leftAt: new Date() })
			.where(
				inArray(
					servers.id,
					guildsToRemove.map((g) => g.id),
				),
			);
	});

	if (error) {
		logger.fatal(error, "Error while removing guilds");
		process.exit(1);
	}

	logger.info(
		{
			guilds: guildsToRemove.map((g) => ({
				id: g.id,
				serverId: g.serverId,
				name: g.name,
			})),
		},
		"Removed from guilds while offline",
	);

	removeGuildsFromCache(guildsToRemove);
}

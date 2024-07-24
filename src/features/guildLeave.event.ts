import { until } from "@open-draft/until";
import type { Guild } from "discord.js";
import { eq } from "drizzle-orm";
import { db } from "~/database/db";
import { servers, serverSettings } from "~/database/schema";
import type { EventHandler, EventName } from "~/utils/event";
import { logger } from "~/utils/logger";
import { getGuildId, guildIdCache } from "~/utils/misc";

export const name: EventName = "guildDelete";
export const once = false;

export const handler: EventHandler<typeof name> = async (g) => {
	const id = getGuildId(g.id);
	if (!id) {
		logError(g, new Error("Guild ID not found in cache"));
		return;
	}

	const { error } = await until(() => softDeleteGuild(id));
	if (error) {
		logError(g, error);
		return;
	}

	logger.info({ id, serverId: g.id, name: g.name }, "Left guild");
	guildIdCache.delete(g.id);
};

function softDeleteGuild(id: string): Promise<void> {
	return db.transaction(async (tx) => {
		await Promise.all([
			tx.update(servers).set({ leftAt: new Date() }).where(eq(servers.id, id)),
			tx
				.update(serverSettings)
				.set({ deletedAt: new Date() })
				.where(eq(serverSettings.id, id)),
		]);
	});
}

function logError(g: Guild, error: unknown): void {
	logger.error(
		{ serverId: g.id, name: g.name, error },
		"Failed to update database on guild leave",
	);
}

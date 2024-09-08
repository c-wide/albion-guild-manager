import { until } from "@open-draft/until";
import { eq } from "drizzle-orm";
import { db } from "~/database/db";
import { serverSettings, servers } from "~/database/schema";
import type { EventHandler, EventName } from "~/utils/event";
import { logger } from "~/utils/logger";
import { getServerId, guildCache } from "~/utils/misc";

export const name: EventName = "guildDelete";
export const once = false;

export const handler: EventHandler<typeof name> = async (g) => {
	const id = getServerId(g.id);
	if (!id) {
		logger.error(
			{ guildId: g.id, error: "Guild ID not found in cache" },
			"Failed to update database on guild leave",
		);
		return;
	}

	const { error } = await until(() => softDeleteGuild(id));
	if (error) {
		logger.error(
			{ serverId: id, guildId: g.id, error },
			"Failed to update database on guild leave",
		);
		return;
	}

	logger.info({ serverId: id, guildId: g.id }, "Left guild");
	guildCache.delete(g.id);
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

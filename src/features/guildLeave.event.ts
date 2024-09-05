import { until } from "@open-draft/until";
import { eq } from "drizzle-orm";
import { db } from "~/database/db";
import { servers, serverSettings } from "~/database/schema";
import type { EventHandler, EventName } from "~/utils/event";
import { logger } from "~/utils/logger";
import { getGuildId, guildCache } from "~/utils/misc";

export const name: EventName = "guildDelete";
export const once = false;

export const handler: EventHandler<typeof name> = async (g) => {
	const id = getGuildId(g.id);
	if (!id) {
		logger.error(
			{ serverId: g.id, error: "Guild ID not found in cache" },
			"Failed to update database on guild leave",
		);
		return;
	}

	const { error } = await until(() => softDeleteGuild(id));
	if (error) {
		logger.error(
			{ id, serverId: g.id, error },
			"Failed to update database on guild leave",
		);
		return;
	}

	logger.info({ id, serverId: g.id }, "Left guild");
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

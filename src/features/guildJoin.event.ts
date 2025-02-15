import { until } from "@open-draft/until";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "#src/database/db.ts";
import { serverSettings, servers } from "#src/database/schema.ts";
import type { EventHandler, EventName } from "#src/utils/event.ts";
import { logger } from "#src/utils/logger.ts";
import { getErrorMessage, guildCache } from "#src/utils/misc.ts";

export const name: EventName = "guildCreate";
export const once = false;

export const handler: EventHandler<typeof name> = async (g) => {
	const { error, data } = await until(() => {
		return db.transaction(async (tx) => {
			// Check if server already exists in database
			const [server] = await tx
				.select({ id: servers.id })
				.from(servers)
				.where(and(eq(servers.guildId, g.id), isNull(servers.leftAt)));

			// If it does, warn and soft delete
			if (server) {
				logger.warn(
					{ serverId: server.id, guildId: g.id },
					"Server already exists in database",
				);

				await Promise.all([
					tx
						.update(servers)
						.set({ leftAt: new Date() })
						.where(eq(servers.id, server.id)),
					tx
						.update(serverSettings)
						.set({ deletedAt: new Date() })
						.where(eq(serverSettings.id, server.id)),
				]);
			}

			// Insert new server like normal and return created ID
			const [newServer] = await tx
				.insert(servers)
				.values({
					guildId: g.id,
				})
				.returning({ id: servers.id });

			return newServer.id;
		});
	});

	if (error) {
		logger.error(
			{ guildId: g.id, error: getErrorMessage(error) },
			"Failed to insert new server into database",
		);
		return;
	}

	logger.info({ serverId: data, guildId: g.id }, "Guild joined");

	guildCache.set(g.id, {
		id: data,
		settings: new Map(),
	});
};

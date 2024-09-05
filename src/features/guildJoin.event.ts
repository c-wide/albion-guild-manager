import { until } from "@open-draft/until";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "~/database/db";
import { servers, serverSettings } from "~/database/schema";
import type { EventHandler, EventName } from "~/utils/event";
import { logger } from "~/utils/logger";
import { guildCache } from "~/utils/misc";

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
					{ id: server.id, serverId: g.id },
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
			{ serverId: g.id, error },
			"Failed to insert new server into database",
		);
		return;
	}

	logger.info({ id: data, serverId: g.id }, "Guild joined");

	guildCache.set(g.id, {
		id: data,
		settings: new Map(),
	});
};

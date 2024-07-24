import { until } from "@open-draft/until";
import type { Guild } from "discord.js";
import { eq } from "drizzle-orm";
import { db } from "~/database/db";
import { servers } from "~/database/schema";
import { config } from "~/utils/config";
import type { EventHandler, EventName } from "~/utils/event";
import { logger } from "~/utils/logger";
import { getGuildDiff, guildIdCache } from "~/utils/misc";

export const name: EventName = "guildUpdate";
export const once = false;

export const handler: EventHandler<typeof name> = async (
	oldGuild,
	newGuild,
) => {
	const diff = getGuildDiff(oldGuild, newGuild, config.guildChangeKeys);
	if (!diff) return;

	const { serverId, changes } = diff;

	const id = guildIdCache.get(serverId);
	if (!id) {
		logError(newGuild, new Error("Guild ID not found in cache"));
		return;
	}

	const { error } = await until(() => {
		return db.update(servers).set(changes).where(eq(servers.id, id));
	});

	if (error) {
		logError(newGuild, error);
		return;
	}

	logger.info({ id, serverId, changes }, "Guild settings changed");
};

function logError(g: Guild, error: unknown): void {
	logger.error(
		{ serverId: g.id, name: g.name, error },
		"Failed to update database on guild settings change",
	);
}

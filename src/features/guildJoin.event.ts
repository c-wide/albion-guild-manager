import { until } from "@open-draft/until";
import { db } from "~/database/db";
import { servers } from "~/database/schema";
import type { EventHandler, EventName } from "~/utils/event";
import { logger } from "~/utils/logger";
import { guildIdCache } from "~/utils/misc";

export const name: EventName = "guildCreate";
export const once = false;

export const handler: EventHandler<typeof name> = async (g) => {
	const { error, data } = await until(() => {
		return db
			.insert(servers)
			.values({
				serverId: g.id,
				name: g.name,
				nameAcronym: g.nameAcronym,
				iconURL: g.iconURL(),
				bannerURL: g.bannerURL(),
				createdAt: g.createdAt,
			})
			.returning({ id: servers.id });
	});

	if (error) {
		logger.error(
			{ serverId: g.id, serverName: g.name, error },
			"Failed to insert new server into database",
		);
		return;
	}

	logger.info(
		{ id: data[0].id, serverId: g.id, serverName: g.name },
		"Guild joined",
	);

	guildIdCache.set(g.id, data[0].id);
};

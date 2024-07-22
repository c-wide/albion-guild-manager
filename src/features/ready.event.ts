import type { EventHandler, EventName } from "~/utils/event";
import { logger } from "~/utils/logger";

export const name: EventName = "ready";

export const once = true;

export const handler: EventHandler<typeof name> = (c) => {
	logger.info(`Logged in as ${c.user.tag}!`);
};

import path from "node:path";
import { ShardingManager } from "discord.js";
import { startServerStatusInterval } from "#src/features/server-status/status.ts";
import { env } from "#src/utils/env.ts";
import { logger } from "#src/utils/logger.ts";

const manager = new ShardingManager(path.join(import.meta.dirname, "bot.ts"), {
	token: env.DISCORD_TOKEN,
});

manager.on("shardCreate", (shard) =>
	logger.info({ shardId: shard.id }, "Shard Launched"),
);

await manager.spawn();

startServerStatusInterval(manager);

// TODO: middleware system for stuff like changes to servers?
// TODO: add name localizaitons to command builders
// TODO: eventually redo lookup i18n to match new format
// TODO: unhandled rejection and uncaught exceptions
// TODO: need a good way to remove registered commands while developing

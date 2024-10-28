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

// FIXME: Fix modal for server status wizard, need filter and custom id
// TODO: server status channel create should put it into monitoring category
// TODO: request coalescing to prevent external API overusage
// TODO: middleware system for stuff like changes to servers?
// TODO: add name localizaitons to command builders
// TODO: unhandled rejection and uncaught exceptions

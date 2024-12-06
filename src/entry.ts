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

// FIXME: paginate manager listing
// TODO: am I using logger.info vs logger.error correctly?
// TODO: add indexes to schema
// TODO: do I need to log collection interacitons?
// TODO: lookup cmd by name or id
// TODO: remove interactables upon timeout
// TODO: feedback cmd?
// TODO: guild attendance command
// TODO: request coalescing to prevent external API overusage
// TODO: add name localizaitons to command builders
// TODO: unhandled rejection and uncaught exceptions

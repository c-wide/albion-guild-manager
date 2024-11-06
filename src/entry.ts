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
// TODO: do I need to log collection interacitons?
// TODO: lookup by name or id
// TODO: server status channel create should put it into monitoring category
// TODO: welcome message to inviter DM
// TODO: remove interactables upon timeout
// TODO: feedback cmd?
// TODO: request coalescing to prevent external API overusage
// TODO: middleware system for stuff like changes to servers?
// TODO: add name localizaitons to command builders
// TODO: unhandled rejection and uncaught exceptions

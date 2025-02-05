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

// TODO: centralize confirm/cancel action
// TODO: remove interactables upon timeout
// TODO: feedback cmd?
// TODO: guild attendance command
// TODO: add name localizaitons to command builders
// TODO: unhandled rejection and uncaught exceptions

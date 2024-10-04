import path from "node:path";
import { ShardingManager } from "discord.js";
import { startServerStatusInterval } from "~/features/server-status/status";
import { env } from "~/utils/env";
import { logger } from "~/utils/logger";

const manager = new ShardingManager(path.join(__dirname, "bot.ts"), {
	token: env.DISCORD_TOKEN,
});

manager.on("shardCreate", (shard) =>
	logger.info({ shardId: shard.id }, "Shard Launched"),
);

await manager.spawn();

startServerStatusInterval(manager);

// TODO: add name localizaitons to command builders
// TODO: eventually redo lookup i18n to match new format
// TODO: unhandled rejection and uncaught exceptions
// TODO: need a good way to remove registered commands while developing

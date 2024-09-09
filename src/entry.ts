import path from "node:path";
import { ShardingManager } from "discord.js";
import { env } from "~/utils/env";
import { logger } from "~/utils/logger";

const manager = new ShardingManager(path.join(__dirname, "bot.ts"), {
	token: env.DISCORD_TOKEN,
	respawn: false,
});

manager.on("shardCreate", (shard) =>
	logger.info({ shardId: shard.id }, "Shard Launched"),
);

await manager.spawn();

// TODO: unhandled rejection and uncaught exceptions
// TODO: need a good way to remove registered commands

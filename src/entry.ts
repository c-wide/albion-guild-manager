import path from "node:path";
import { ShardingManager } from "discord.js";
import { env } from "./utils/env";
import { logger } from "./utils/logger";

const manager = new ShardingManager(path.join(__dirname, "bot.ts"), {
	token: env.DISCORD_TOKEN,
});

manager.on("shardCreate", (shard) =>
	logger.info({ id: shard.id }, "Shard Launched"),
);

manager.spawn();

// TODO: interval to detect guilds left while offline
// TODO: unhandled rejection and uncaught exceptions
// TODO: need a good way to remove registered commands

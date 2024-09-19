import path from "node:path";
import { ShardingManager } from "discord.js";
import { env } from "~/utils/env";
import { logger } from "~/utils/logger";

const manager = new ShardingManager(path.join(__dirname, "bot.ts"), {
	token: env.DISCORD_TOKEN,
});

manager.on("shardCreate", (shard) =>
	logger.info({ shardId: shard.id }, "Shard Launched"),
);

await manager.spawn();

// TODO: refactor utc and lookup commands to use normal strings inside handler
// TODO: add name localizaitons to command builders
// TODO: should I be responding in a users/servers locale? should I add override option to commands?
// TODO: eventually redo lookup i18n to match new format
// TODO: unhandled rejection and uncaught exceptions
// TODO: need a good way to remove registered commands while developing

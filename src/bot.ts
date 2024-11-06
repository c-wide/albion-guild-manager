import { Client, GatewayIntentBits } from "discord.js";
import { db } from "#src/database/db.ts";
import { config } from "#src/utils/config.ts";
import { env } from "#src/utils/env.ts";
import { registerEvents } from "#src/utils/event.ts";
import i18n from "#src/utils/i18n.ts";
import { logger } from "#src/utils/logger.ts";
import { guildCache } from "#src/utils/misc.ts";

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildVoiceStates,
	],
});

// Attach stuff to the client for use with sharding methods
client.config = config;
client.logger = logger;
client.i18n = i18n;
client.db = db;
client.guildCache = guildCache;

await registerEvents(client);
await client.login(env.DISCORD_TOKEN);

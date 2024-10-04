import { Client, GatewayIntentBits } from "discord.js";
import { db } from "~/database/db";
import { config } from "~/utils/config";
import { env } from "~/utils/env";
import { registerEvents } from "~/utils/event";
import i18n from "~/utils/i18n";
import { logger } from "~/utils/logger";
import { guildCache } from "~/utils/misc";

const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

// Attach stuff to the client for use with sharding methods
client.config = config;
client.logger = logger;
client.i18n = i18n;
client.db = db;
client.guildCache = guildCache;

await registerEvents(client);
await client.login(env.DISCORD_TOKEN);

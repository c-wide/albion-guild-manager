import { Client, GatewayIntentBits } from "discord.js";
import { env } from "~/utils/env";
import { registerEvents } from "~/utils/event";

const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

registerEvents(client);

client.login(env.DISCORD_TOKEN);

// TODO: unhandled rejection and uncaught exceptions

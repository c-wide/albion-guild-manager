import { Client, GatewayIntentBits } from "discord.js";
import { env } from "~/utils/env";
import { registerEvents } from "~/utils/event";

const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

registerEvents(client);

client.login(env.DISCORD_TOKEN);

// TODO: adapt code for sharding in the future
// TODO: when I provide translations to commands do I need to put the default lng?
// TODO: unhandled rejection and uncaught exceptions
// TODO: need a good way to remove registered commands
// TODO: use i18n intl number

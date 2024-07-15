import { Events, GatewayIntentBits } from "discord.js";
import { env } from "~/utils/env";
import { DiscordClient } from "~/utils/discordClient";

const client = new DiscordClient({
	intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, (c) => {
	console.log(`Logged in as ${c.user.tag}!`);
});

client.login(env.DISCORD_TOKEN);

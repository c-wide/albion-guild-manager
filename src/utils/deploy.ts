import { REST, Routes } from "discord.js";
import { commandFiles } from "~/utils/command";
import { env } from "~/utils/env";

const commands: string[] = [];

for await (const command of commandFiles()) {
	commands.push(command.builder.toJSON());
}

const rest = new REST().setToken(env.DISCORD_TOKEN);

const route = env.DISCORD_GUILD_ID
	? Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID)
	: Routes.applicationCommands(env.DISCORD_CLIENT_ID);

await rest.put(route, { body: commands });

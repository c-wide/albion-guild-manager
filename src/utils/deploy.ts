import { REST, Routes } from "discord.js";
import { commandFiles } from "#src/utils/command.ts";
import { env } from "#src/utils/env.ts";
import { logger } from "#src/utils/logger.ts";
import { getErrorMessage } from "#src/utils/misc.ts";

logger.info("Beginning command deployment");

const commands: string[] = [];

// Parse command files and add builder json to commands array.
// The generator will handle validating the schema and displaying errors.
try {
	for await (const file of commandFiles()) {
		commands.push(file.builder.toJSON());
	}
} catch (_) {
	logger.fatal("Command deployment failed due to invalid command files");
	process.exit(1);
}

const rest = new REST().setToken(env.DISCORD_TOKEN);

// If guild id env var is set, deploy commands to guild, otherwise deploy globally
const route = env.DISCORD_GUILD_ID
	? Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID)
	: Routes.applicationCommands(env.DISCORD_CLIENT_ID);

try {
	await rest.put(route, { body: commands });

	logger.info(
		`Successfully deployed commands ${
			env.DISCORD_GUILD_ID ? `to guild ${env.DISCORD_GUILD_ID}` : "globally"
		}`,
	);
} catch (e) {
	logger.fatal(e, `Command deployment failed - ${getErrorMessage(e)}`);
	process.exit(1);
}

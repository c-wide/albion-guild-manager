import { readdir } from "node:fs/promises";
import path from "node:path";
import { SlashCommandBuilder } from "discord.js";
import {
	commands,
	commandSchema,
	type CommandHandler,
} from "#src/utils/command.ts";

export const builder = new SlashCommandBuilder()
	.setName("reload")
	.setDescription("Reloads a command")
	.addStringOption((option) =>
		option
			.setName("command")
			.setDescription("The command to reload")
			.setRequired(true),
	);

export const handler: CommandHandler = async ({ i }) => {
	const commandName = i.options.getString("command", true);

	if (!commands.has(commandName)) {
		await i.reply({
			content: `There is no command with the name \`${commandName}\``,
			ephemeral: true,
		});
		return;
	}

	const filePaths = await readdir(
		path.join(import.meta.dirname, "../features"),
		{
			recursive: true,
		},
	);

	const subpath = filePaths.find((fp) =>
		fp.includes(`${commandName}.command.ts`),
	);

	if (!subpath) {
		await i.reply({
			content: `Cannot find file for the \`${commandName}\` command`,
			ephemeral: true,
		});
		return;
	}

	const filePath = path.join(import.meta.dirname, "../features", subpath);

	// This won't work in Node
	delete require.cache[require.resolve(filePath)];

	const file = await import(filePath);
	const parsed = commandSchema.safeParse(file);

	if (!parsed.success) {
		await i.reply({
			content: `Failed to reload the \`${commandName}\` command: Schema validation failed`,
			ephemeral: true,
		});
		return;
	}

	commands.set(file.builder.name, {
		handler: file.handler,
		builder: file.builder,
		autocomplete: file.autocomplete,
		cooldown: file.cooldown,
	});

	await i.reply({
		content: `\`${commandName}\` command was successfully reloaded`,
		ephemeral: true,
	});
};

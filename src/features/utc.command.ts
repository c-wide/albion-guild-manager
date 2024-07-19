import { SlashCommandBuilder } from "discord.js";
import type { CommandHandler } from "~/utils/command";

export const builder = new SlashCommandBuilder()
	.setName("utc")
	.setDescription("Get the current UTC time");

export const handler: CommandHandler = async (i) => {
	await i.reply(
		`The current UTC time is ${new Date().toUTCString().split(" ")[4]}`,
	);
};

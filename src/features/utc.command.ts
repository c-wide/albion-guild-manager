import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { CommandHandler } from "#src/utils/command.ts";
import { config } from "#src/utils/config.ts";
import i18n from "#src/utils/i18n.ts";
import { createGenericEmbed } from "#src/utils/misc.ts";

export const cooldown = 5;

export const builder = new SlashCommandBuilder()
	.setName(i18n.t("utc.name", { ns: "commands", lng: "en" }))
	.setDescription(i18n.t("utc.desc", { ns: "commands", lng: "en" }));

export const handler: CommandHandler = async ({ i }) => {
	await i.reply({
		content: "",
		embeds: [
			createGenericEmbed({
				title: " ",
				description: i18n.t("utc.res", {
					utcTime: new Date().toUTCString().split(" ")[4],
					ns: "commands",
					lng: i.locale,
				}),
				color: config.colors.info,
			}),
		],
		flags: MessageFlags.Ephemeral,
	});
};

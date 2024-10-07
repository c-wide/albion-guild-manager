import { SlashCommandBuilder } from "discord.js";
import type { CommandHandler } from "~/utils/command";
import { config } from "~/utils/config";
import i18n from "~/utils/i18n";
import { createGenericEmbed } from "~/utils/misc";

export const cooldown = 5;

export const builder = new SlashCommandBuilder()
	.setName(i18n.t("utc.name", { ns: "commands", lng: "en" }))
	.setDescription(i18n.t("utc.desc", { ns: "commands", lng: "en" }));

export const handler: CommandHandler = async ({ i }) => {
	await i.reply({
		content: "",
		ephemeral: true,
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
	});
};

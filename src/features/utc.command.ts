import { SlashCommandBuilder } from "discord.js";
import type { CommandHandler } from "~/utils/command";
import i18n from "~/utils/i18n";

export const cooldown = 5;

export const builder = new SlashCommandBuilder()
	.setName(i18n.t("cmd-utc-name"))
	.setDescription(i18n.t("cmd-utc-desc"));

export const handler: CommandHandler = async (i) => {
	await i.reply({
		content: i18n.t("cmd-utc-res", {
			utcTime: new Date().toUTCString().split(" ")[4],
			lng: i.locale,
		}),
		ephemeral: true,
	});
};

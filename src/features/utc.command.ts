import { SlashCommandBuilder } from "discord.js";
import type { CommandHandler } from "~/utils/command";
import i18n from "~/utils/i18n";

export const cooldown = 5;

export const builder = new SlashCommandBuilder()
	.setName(i18n.t("utc.name", { ns: "commands", lng: "en" }))
	.setDescription(i18n.t("utc.desc", { ns: "commands", lng: "en" }));

export const handler: CommandHandler = async (i) => {
	await i.reply({
		content: i18n.t("utc.res", {
			utcTime: new Date().toUTCString().split(" ")[4],
			ns: "commands",
			lng: i.locale,
		}),
		ephemeral: true,
	});
};

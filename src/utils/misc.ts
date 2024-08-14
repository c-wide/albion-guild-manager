import { AlbionSDK } from "albion-sdk";
import { EmbedBuilder, type APIEmbedField } from "discord.js";
import { logger } from "~/utils/logger";
import i18n from "~/utils/i18n";
import { config } from "./config";

export const sdks = {
	Americas: new AlbionSDK("Americas"),
	Asia: new AlbionSDK("Asia"),
	Europe: new AlbionSDK("Europe"),
} as const;

export function getErrorMessage(error: unknown) {
	if (typeof error === "string") return error;
	if (
		error &&
		typeof error === "object" &&
		"message" in error &&
		typeof error.message === "string"
	) {
		return error.message;
	}
	console.error("Unable to get error message for error", error);
	return "Unknown Error";
}

export const guildIdCache = new Map<string, string>();

export function getGuildId(guildId: string): string | null {
	const id = guildIdCache.get(guildId);
	if (id) return id;
	logger.warn({ guildId }, "Guild not found in cache");
	return null;
}

export type GuildDiff = { serverId: string; changes: Record<string, unknown> };

export function getGuildDiff(
	// biome-ignore lint: expected any
	oldGuild: any,
	// biome-ignore lint: expected any
	newGuild: any,
	changeKeys: readonly string[],
): GuildDiff | null {
	const changes: Record<string, unknown> = {};

	for (const key of changeKeys) {
		const oldValue =
			typeof oldGuild[key] === "function" ? oldGuild[key]() : oldGuild[key];
		const newValue =
			typeof newGuild[key] === "function" ? newGuild[key]() : newGuild[key];

		if (oldValue !== newValue) {
			changes[key] = newValue;
		}
	}

	if (Object.keys(changes).length === 0) return null;

	return { serverId: newGuild.id, changes };
}

export type GenericEmbedOptions = {
	title: string;
	description: string;
	fields?: APIEmbedField[];
	color?: `#${string}`;
};

export function createGenericEmbed({
	title,
	description,
	fields,
	color,
}: GenericEmbedOptions): EmbedBuilder {
	const embed = new EmbedBuilder()
		.setTitle(title)
		.setDescription(description)
		.setColor(color ?? "#1C1C1C")
		.setFooter({
			text: config.botName,
			iconURL: config.avatarURL,
		});

	if (fields) {
		embed.addFields(fields);
	}

	return embed;
}

export function createErrorEmbed(
	message: string,
	locale: string,
): EmbedBuilder {
	return new EmbedBuilder()
		.setTitle(i18n.t("embed-err-generic-title", { lng: locale }))
		.setDescription(
			`${message}\n\n${i18n.t("embed-err-generic-footer", {
				url: config.supportDiscordURL,
				lng: locale,
				interpolation: { escapeValue: false },
			})}`,
		)
		.setColor("#ff3838")
		.setFooter({
			text: config.botName,
			iconURL: config.avatarURL,
		});
}

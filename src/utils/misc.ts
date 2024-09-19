import { AlbionSDK } from "albion-sdk";
import { type APIEmbedField, type Client, EmbedBuilder } from "discord.js";
import { config } from "~/utils/config";
import i18n from "~/utils/i18n";
import { logger } from "~/utils/logger";

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

export const Settings = {
	ManagerRoles: "manager_roles",
	ManagerUsers: "manager_users",
	ServerStatusChannel: "server_status_channel",
} as const;
export type SettingsKey = (typeof Settings)[keyof typeof Settings];

export type GuildDetails = {
	id: string;
	settings: Map<SettingsKey, unknown>;
};

// Discord Guild ID -> GuildDetails
export const guildCache = new Map<string, GuildDetails>();

export function getServerId(guildId: string | null | undefined): string | null {
	if (!guildId) return null;
	const guild = guildCache.get(guildId);
	if (guild) return guild.id;
	logger.warn({ guildId }, "Guild not found in cache");
	return null;
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
		.setColor(color ?? config.colors.default);

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
		.setTitle(i18n.t("error.generic.title", { ns: "system", lng: locale }))
		.setDescription(
			`${message}\n\n${i18n.t("error.generic.footer", {
				url: config.supportDiscordURL,
				ns: "system",
				lng: locale,
				interpolation: { escapeValue: false },
			})}`,
		)
		.setColor(config.colors.error);
}

export type OptionFunc<T> = (option: T) => T;

export function getShardId(client: Client<true>): number {
	const id = client.shard?.ids[0];

	if (id === undefined) {
		logger.warn("Unable to extract shard id");
		return -1;
	}

	return id;
}

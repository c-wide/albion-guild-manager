import { AlbionSDK } from "albion-sdk";
import {
	type APIEmbedField,
	type APIInteractionGuildMember,
	type Client,
	EmbedBuilder,
	type GuildMember,
	PermissionFlagsBits,
} from "discord.js";
import { config } from "#src/utils/config.ts";
import i18n from "#src/utils/i18n.ts";
import { logger } from "#src/utils/logger.ts";

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
	ManagerRole: "manager_role",
	ServerStatusChannel: "server_status_channel",
	ServerStatusRegions: "server_status_regions",
	ServerStatusToggle: "server_status_toggle",
	SplitManagerRole: "split_manager_role",
	SplitAuditLogChannel: "split_audit_log_channel",
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

export function isAdminOrManager(
	member: GuildMember | APIInteractionGuildMember | null,
	cache: GuildDetails,
): boolean {
	// If you didnt give me a member, I can't check their permissions
	if (member === null) return false;

	// smile
	if (typeof member.permissions === "string") return false;
	if (Array.isArray(member.roles)) return false;

	// Check if the member has ManageGuild permission
	if (member.permissions?.has(PermissionFlagsBits.ManageGuild)) return true;

	// Extract manager role from guild settings
	const managerRole = cache.settings.get(Settings.ManagerRole) as
		| string
		| undefined;

	// Check if member has the manager role
	if (managerRole && member.roles.cache.has(managerRole)) return true;

	// If none of the above conditions are met, return false
	return false;
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
	cid: string,
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
		.addFields([
			{
				name: " ",
				value: " ",
			},
			{
				name: i18n.t("phrases.correlationId", { ns: "common", lng: locale }),
				value: `\`\`\`${cid}\`\`\``,
				inline: true,
			},
			{
				name: " ",
				value: " ",
				inline: true,
			},
		])
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

export function arrayToCSV(data: Record<string, unknown>[]): string {
	if (data.length === 0) return "";
	let result = Object.keys(data[0]).join(",");
	for (const obj of data) {
		result += `\n${Object.values(obj).join(",")}`;
	}
	return result;
}

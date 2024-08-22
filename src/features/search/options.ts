import type { ChatInputCommandInteraction } from "discord.js";
import type { AlbionServerRegion } from "~/utils/config";
import i18n from "~/utils/i18n";

export type EntityType = "player" | "guild" | "alliance";
export type SearchOptions = {
	entityType: EntityType;
	serverRegion: AlbionServerRegion;
	searchTerm: string;
	isPublic: boolean;
};

export function parseOptions(i: ChatInputCommandInteraction): SearchOptions {
	const entityType = i.options.getString(
		i18n.t("option.entityType.name", { ns: "common" }),
		true,
	) as "player" | "guild" | "alliance";

	const serverRegion = i.options.getString(
		i18n.t("option.serverRegion.name", { ns: "common" }),
		true,
	) as AlbionServerRegion;

	const searchTerm = i.options.getString(
		i18n.t("option.searchTerm.name", { ns: "common" }),
		true,
	);

	// Default value is false
	const isPublic =
		i.options.getBoolean(i18n.t("option.isPublic.name", { ns: "common" })) ??
		false;

	return { entityType, serverRegion, searchTerm, isPublic };
}

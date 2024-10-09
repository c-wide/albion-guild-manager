import type { ChatInputCommandInteraction } from "discord.js";
import type { AlbionServerRegion } from "#src/utils/config.ts";
import i18n from "#src/utils/i18n.ts";

export type EntityType = "player" | "guild" | "alliance";
export type SearchOptions = {
	entityType: EntityType;
	serverRegion: AlbionServerRegion;
	searchTerm: string;
	isPublic: boolean;
};

export function parseOptions(i: ChatInputCommandInteraction): SearchOptions {
	const entityType = i.options.getSubcommand() as
		| "player"
		| "guild"
		| "alliance";

	const serverRegion = i.options.getString(
		i18n.t("option.serverRegion.name", { ns: "common", lng: "en" }),
		true,
	) as AlbionServerRegion;

	const searchTerm = i.options.getString(
		i18n.t("lookup.option.searchTerm.name", { ns: "commands", lng: "en" }),
		true,
	);

	// Default value is false
	const isPublic =
		i.options.getBoolean(
			i18n.t("option.isPublic.name", { ns: "common", lng: "en" }),
		) ?? false;

	return { entityType, serverRegion, searchTerm, isPublic };
}

import type { ChatInputCommandInteraction } from "discord.js";
import type { AlbionServerRegion } from "#src/utils/config.ts";

export type EntityType = "player" | "guild" | "alliance";
export type SearchOptions = {
	entityType: EntityType;
	serverRegion: AlbionServerRegion;
	searchTerm: string;
	isPublic: boolean;
};

export function parseOptions(
	i: ChatInputCommandInteraction<"cached">,
): SearchOptions {
	const entityType = i.options.getSubcommand() as
		| "player"
		| "guild"
		| "alliance";

	const serverRegion = i.options.getString(
		"server_region",
		true,
	) as AlbionServerRegion;

	const searchTerm = i.options.getString("search_term", true);

	// Default value is false
	const isPublic = i.options.getBoolean("is_public") ?? false;

	return { entityType, serverRegion, searchTerm, isPublic };
}

import type { Alliance, GuildInfo, Player } from "albion-sdk";
import type { Locale } from "discord.js";
import type {
	EntityType,
	SearchOptions,
} from "#src/features/lookup/options.ts";
import type { AlbionServerRegion } from "#src/utils/config.ts";
import i18n from "#src/utils/i18n.ts";
import { sdks } from "#src/utils/misc.ts";

export type SearchResult = {
	label: string;
	description: string;
	value: string;
};

export async function genericSearch(
	options: SearchOptions,
	lng: Locale,
): Promise<SearchResult[]> {
	const { entityType, serverRegion, searchTerm } = options;

	// If searching for a player or guild, I want to use Albion Killboard API
	// If searching for an alliance, I want to use Albion Registry API
	switch (entityType) {
		case "player":
		case "guild": {
			const res = await sdks[serverRegion].search(searchTerm);

			return res[entityType === "player" ? "players" : "guilds"].map(
				(entity) => ({
					label: entity.Name,
					description: i18n.t("phrases.idDesc", {
						id: entity.Id,
						ns: "common",
						lng,
					}),
					value: entity.Id,
				}),
			);
		}
		case "alliance": {
			const res = await fetch(
				`https://albion-registry-api.fly.dev/search/entities/${serverRegion.toLowerCase()}?q=${searchTerm}`,
			);

			if (!res.ok) {
				throw new Error(`Failed to fetch alliance details: ${res.statusText}`);
			}

			const data = (await res.json()) as {
				id: string;
				tag: string;
				name: string;
				type: "player" | "guild" | "alliance";
			}[];

			return data
				.filter((d) => d.type === "alliance")
				.map((d) => ({
					label: `[${d.tag}] ${d.name}`,
					description: i18n.t("phrases.idDesc", {
						id: d.id,
						ns: "common",
						lng,
					}),
					value: d.id,
				}));
		}
		default:
			throw new Error("Invalid entity type");
	}
}

export type EntityDetails = Player | GuildInfo | Alliance;
export async function getEntityDetails(
	entityId: string,
	entityType: EntityType,
	serverRegion: AlbionServerRegion,
): Promise<EntityDetails> {
	switch (entityType) {
		case "player":
			return await sdks[serverRegion].getPlayerInfo(entityId);
		case "guild":
			return await sdks[serverRegion].getGuildInfo(entityId);
		case "alliance":
			return await sdks[serverRegion].getAllianceInfo(entityId);
		default:
			throw new Error("Invalid entity type");
	}
}

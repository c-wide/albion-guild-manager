import type { Player, GuildInfo, Alliance } from "albion-sdk";
import type { EntityType, SearchOptions } from "~/features/search/options";
import type { AlbionServerRegion } from "~/utils/config";
import { sdks } from "~/utils/misc";
import i18n from "~/utils/i18n";
import type { Locale } from "discord.js";

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

	switch (entityType) {
		case "player":
		case "guild": {
			const res = await sdks[serverRegion].search(searchTerm);

			return res[entityType === "player" ? "players" : "guilds"].map(
				(entity) => ({
					label: entity.Name,
					description: i18n.t("cmd-search-res-search-desc", {
						id: entity.Id,
						lng,
					}),
					value: entity.Id,
				}),
			);
		}
		case "alliance": {
			const res = await fetch(
				`https://registry-api.albion.tools/search/entities/${serverRegion.toLowerCase()}?q=${searchTerm}`,
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
					description: i18n.t("cmd-search-res-search-desc", { id: d.id, lng }),
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

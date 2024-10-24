import {
	ActionRowBuilder,
	type ChatInputCommandInteraction,
	type Message,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
} from "discord.js";
import type { SearchOptions } from "#src/features/lookup/options.ts";
import type { SearchResult } from "#src/features/lookup/search.ts";
import i18n from "#src/utils/i18n.ts";

export async function sendSelectMenu(
	i: ChatInputCommandInteraction,
	options: SearchOptions,
	searchResults: SearchResult[],
): Promise<Message> {
	const { entityType } = options;

	const selectMenu = new StringSelectMenuBuilder()
		.setCustomId("search_entity")
		.setPlaceholder(
			i18n.t("lookup.components.searchEntity.placeholder", {
				ns: "commands",
				lng: i.locale,
			}),
		)
		.addOptions(
			searchResults.map((result) =>
				new StringSelectMenuOptionBuilder()
					.setLabel(result.label)
					.setDescription(result.description)
					.setValue(result.value),
			),
		);

	const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
		selectMenu,
	);

	const response = await i.followUp({
		content: i18n.t("lookup.responses.selectEntity", {
			entityType,
			ns: "commands",
			lng: i.locale,
		}),
		components: [row],
	});

	return response;
}

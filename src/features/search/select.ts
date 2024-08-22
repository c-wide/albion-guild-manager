import {
	ActionRowBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	type ChatInputCommandInteraction,
	type Message,
} from "discord.js";
import type { SearchResult } from "~/features/search/lookup";
import type { SearchOptions } from "~/features/search/options";
import i18n from "~/utils/i18n";

export async function sendSelectMenu(
	i: ChatInputCommandInteraction,
	options: SearchOptions,
	searchResults: SearchResult[],
): Promise<Message> {
	const { entityType } = options;

	const selectMenu = new StringSelectMenuBuilder()
		.setCustomId("search_entity")
		.setPlaceholder(
			i18n.t("phrases.selectPlaceholder", { ns: "common", lng: i.locale }),
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
		content: i18n.t("search.response.selectEntity", {
			entityType,
			ns: "commands",
			lng: i.locale,
		}),
		components: [row],
	});

	return response;
}
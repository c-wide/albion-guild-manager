import { until } from "@open-draft/until";
import { SlashCommandBuilder } from "discord.js";
import type { CommandHandler } from "~/utils/command";
import { config } from "~/utils/config";
import { logger } from "~/utils/logger";
import { parseOptions } from "~/features/search/options";
import { genericSearch, getEntityDetails } from "~/features/search/lookup";
import { sendSelectMenu } from "~/features/search/select";
import { createEmbed } from "~/features/search/embed";
import i18n from "~/utils/i18n";
import { createErrorEmbed, createGenericEmbed } from "~/utils/misc";

// TODO: if only 1 result, just search for it
// TODO: add name locaziations to command builder

export const cooldown = 10;

export const builder = new SlashCommandBuilder()
	.setName(i18n.t("search.name", { ns: "commands" }))
	.setDescription(i18n.t("search.desc", { ns: "commands" }))
	.addStringOption((option) =>
		option
			.setName(i18n.t("option.entityType.name", { ns: "common" }))
			.setDescription(i18n.t("option.entityType.desc", { ns: "common" }))
			.setRequired(true)
			.addChoices(
				{
					name: i18n.t("phrases.player", { count: 1, ns: "common" }),
					value: "player",
				},
				{
					name: i18n.t("phrases.guild", { count: 1, ns: "common" }),
					value: "guild",
				},
				{
					name: i18n.t("phrases.alliance", { count: 1, ns: "common" }),
					value: "alliance",
				},
			),
	)
	.addStringOption((option) =>
		option
			.setName(i18n.t("option.serverRegion.name", { ns: "common" }))
			.setDescription(i18n.t("option.serverRegion.desc", { ns: "common" }))
			.setRequired(true)
			.addChoices(
				config.albionServerRegions.map((region) => ({
					name: i18n.t(
						`phrases.${region.toLowerCase() as "americas" | "asia" | "europe"}`,
						{ ns: "common" },
					),
					value: region,
				})),
			),
	)
	.addStringOption((option) =>
		option
			.setName(i18n.t("option.searchTerm.name", { ns: "common" }))
			.setDescription(
				i18n.t("search.option.searchTerm.desc", { ns: "commands" }),
			)
			.setRequired(true),
	)
	.addBooleanOption((option) =>
		option
			.setName(i18n.t("option.isPublic.name", { ns: "common" }))
			.setDescription(i18n.t("option.isPublic.desc", { ns: "common" }))
			.setRequired(false),
	);

export const handler: CommandHandler = async (i) => {
	// Parse command options
	const options = parseOptions(i);
	const { entityType, searchTerm, serverRegion, isPublic } = options;

	// Initial deferral to prevent timeouts
	await i.deferReply({ ephemeral: !isPublic });

	// Gather search results based on options provided
	const { error: searchError, data: searchResults } = await until(() =>
		genericSearch(options, i.locale),
	);

	// If there was an error while searching, log & send generic error response
	if (searchError) {
		logger.error(
			{ ...options, error: searchError },
			"Error while performing search",
		);
		await i.followUp({
			content: "",
			components: [],
			embeds: [
				createErrorEmbed(
					i18n.t("error.killboardAPI", { ns: "common", lng: i.locale }),
					i.locale,
				),
			],
		});
		return;
	}

	// Handle response if there are no search results
	if (searchResults.length === 0) {
		await i.followUp({
			content: "",
			components: [],
			embeds: [
				createGenericEmbed({
					title: i18n.t("response.noResults.title", {
						ns: "common",
						lng: i.locale,
					}),
					description: i18n.t("response.noResults.desc", {
						entityType,
						searchTerm,
						ns: "common",
						lng: i.locale,
					}),
				}),
			],
		});
		return;
	}

	// Send select menu to user with the search results & await response
	const message = await sendSelectMenu(i, options, searchResults);
	const { error: messageInteractionError, data: messageInteraction } =
		await until(() =>
			message.awaitMessageComponent({
				filter: (mi) => mi.user.id === i.user.id,
				time: 60000 * 3,
			}),
		);

	// If there was an error here, it's usually because the user didn't make a selection
	if (messageInteractionError) {
		await i.editReply({
			content: "",
			components: [],
			embeds: [
				createGenericEmbed({
					title: i18n.t("response.noConfim.title", {
						ns: "common",
						lng: i.locale,
					}),
					description: i18n.t("response.noConfim.desc", {
						timeframe: "3 minutes",
						ns: "common",
						lng: i.locale,
					}),
					color: "#FF5F15",
				}),
			],
		});
		return;
	}

	// Typescript is a fun language
	if (!messageInteraction.isStringSelectMenu()) return;

	// Update user that we're searching so the select menu response doesn't timeout
	await messageInteraction.update({
		content: i18n.t("search.response.searching", {
			entityType,
			ns: "commands",
			lng: i.locale,
		}),
		components: [],
	});

	// Parse the entity id and search for specific entity details
	const entityId = messageInteraction.values[0];
	const { error: entityDetailsError, data: entityDetails } = await until(() =>
		getEntityDetails(entityId, entityType, serverRegion),
	);

	// If there was an error while searching for details, log & send generic error response
	if (entityDetailsError) {
		logger.error(
			{ ...options, error: entityDetailsError },
			"Error while fetching entity details",
		);
		await messageInteraction.editReply({
			content: "",
			components: [],
			embeds: [
				createErrorEmbed(
					i18n.t("error.killboardAPI", { ns: "common", lng: i.locale }),
					i.locale,
				),
			],
		});
		return;
	}

	// If everything went well, send a response with the detailed information
	await messageInteraction.editReply({
		content: "",
		components: [],
		embeds: [createEmbed(entityDetails, options, i.locale)],
	});
};
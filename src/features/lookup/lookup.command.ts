import { until } from "@open-draft/until";
import {
	ComponentType,
	MessageFlags,
	type SlashCommandBooleanOption,
	SlashCommandBuilder,
	type SlashCommandStringOption,
} from "discord.js";
import { createEmbed } from "#src/features/lookup/embed.ts";
import { parseOptions } from "#src/features/lookup/options.ts";
import {
	genericSearch,
	getEntityDetails,
} from "#src/features/lookup/search.ts";
import { sendSelectMenu } from "#src/features/lookup/select.ts";
import type { CommandHandler } from "#src/utils/command.ts";
import { config } from "#src/utils/config.ts";
import i18n from "#src/utils/i18n.ts";
import { logger } from "#src/utils/logger.ts";
import {
	type OptionFunc,
	createErrorEmbed,
	createGenericEmbed,
	getErrorMessage,
} from "#src/utils/misc.ts";

export const cooldown = 10;

const serverRegionOption: OptionFunc<SlashCommandStringOption> = (option) =>
	option
		.setName(i18n.t("options.serverRegion.name", { ns: "common", lng: "en" }))
		.setDescription(
			i18n.t("options.serverRegion.desc", { ns: "common", lng: "en" }),
		)
		.setRequired(true)
		.addChoices(
			config.albionServerRegions.map((region) => ({
				name: i18n.t(
					`phrases.${region.toLowerCase() as "americas" | "asia" | "europe"}`,
					{ ns: "common", lng: "en" },
				),
				value: region,
			})),
		);

const searchTermOption: OptionFunc<SlashCommandStringOption> = (option) =>
	option
		.setName(
			i18n.t("lookup.options.searchTerm.name", { ns: "commands", lng: "en" }),
		)
		.setDescription(
			i18n.t("lookup.options.searchTerm.desc", { ns: "commands", lng: "en" }),
		)
		.setRequired(true);

const isPublicOption: OptionFunc<SlashCommandBooleanOption> = (option) =>
	option
		.setName(i18n.t("options.isPublic.name", { ns: "common", lng: "en" }))
		.setDescription(
			i18n.t("options.isPublic.desc", { ns: "common", lng: "en" }),
		)
		.setRequired(false);

export const builder = new SlashCommandBuilder()
	.setName(i18n.t("lookup.name", { ns: "commands", lng: "en" }))
	.setDescription(i18n.t("lookup.desc", { ns: "commands", lng: "en" }))
	.addSubcommand((subcommand) =>
		subcommand
			.setName(
				i18n.t("lookup.subcommands.player.name", { ns: "commands", lng: "en" }),
			)
			.setDescription(
				i18n.t("lookup.subcommands.player.desc", { ns: "commands", lng: "en" }),
			)
			.addStringOption(serverRegionOption)
			.addStringOption(searchTermOption)
			.addBooleanOption(isPublicOption),
	)
	.addSubcommand((subcommand) =>
		subcommand
			.setName(
				i18n.t("lookup.subcommands.guild.name", { ns: "commands", lng: "en" }),
			)
			.setDescription(
				i18n.t("lookup.subcommands.guild.desc", { ns: "commands", lng: "en" }),
			)
			.addStringOption(serverRegionOption)
			.addStringOption(searchTermOption)
			.addBooleanOption(isPublicOption),
	)
	.addSubcommand((subcommand) =>
		subcommand
			.setName(
				i18n.t("lookup.subcommands.alliance.name", {
					ns: "commands",
					lng: "en",
				}),
			)
			.setDescription(
				i18n.t("lookup.subcommands.alliance.desc", {
					ns: "commands",
					lng: "en",
				}),
			)
			.addStringOption(serverRegionOption)
			.addStringOption(searchTermOption)
			.addBooleanOption(isPublicOption),
	);

export const handler: CommandHandler = async ({ cid, i }) => {
	// Parse command options
	const options = parseOptions(i);
	const { entityType, searchTerm, serverRegion, isPublic } = options;

	// Initial deferral to prevent timeouts
	await i.deferReply({ flags: !isPublic ? MessageFlags.Ephemeral : undefined });

	// Gather search results based on options provided
	const { error: searchError, data: searchResults } = await until(() =>
		genericSearch(options, i.locale),
	);

	// If there was an error while searching, log & send generic error response
	if (searchError) {
		logger.warn(
			{ cid, ...options, error: getErrorMessage(searchError) },
			"Error while performing search",
		);
		await i.followUp({
			content: "",
			components: [],
			embeds: [
				createErrorEmbed(
					cid,
					i18n.t("responses.killboardErr", { ns: "common", lng: i.locale }),
					i.locale,
				),
			],
		});
		return;
	}

	// Handle response if there are no search results
	if (searchResults.length === 0) {
		logger.info({ cid, ...options }, "No search results");
		await i.followUp({
			content: "",
			components: [],
			embeds: [
				createGenericEmbed({
					title: i18n.t("lookup.embeds.noResults.title", {
						ns: "commands",
						lng: i.locale,
					}),
					description: i18n.t("lookup.embeds.noResults.desc", {
						entityType,
						searchTerm,
						ns: "commands",
						lng: i.locale,
					}),
					color: config.colors.info,
				}),
			],
		});
		return;
	}

	// TODO: handle only 1 search result

	// Send select menu to user with the search results & await response
	const message = await sendSelectMenu(i, options, searchResults);
	const { error: messageInteractionError, data: messageInteraction } =
		await until(() =>
			message.awaitMessageComponent({
				filter: (mi) => mi.user.id === i.user.id,
				time: 3 * 60_000,
				componentType: ComponentType.StringSelect,
			}),
		);

	// If there was an error here, it's usually because the user didn't make a selection
	if (messageInteractionError) {
		logger.info({ cid, ...options }, "User failed to respond");
		await i.deleteReply();
		return;
	}

	// Update user that we're searching so the select menu response doesn't timeout
	await messageInteraction.update({
		content: i18n.t("lookup.responses.searching", {
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
		logger.warn(
			{ cid, ...options, error: getErrorMessage(entityDetailsError) },
			"Error while fetching entity details",
		);
		await messageInteraction.editReply({
			content: "",
			components: [],
			embeds: [
				createErrorEmbed(
					cid,
					i18n.t("responses.killboardErr", { ns: "common", lng: i.locale }),
					i.locale,
				),
			],
		});
		return;
	}

	// Log things
	logger.info({ cid, ...options }, "Displaying entity details");

	// If everything went well, send a response with the detailed information
	await messageInteraction.editReply({
		content: "",
		components: [],
		embeds: [createEmbed(entityDetails, options, i.locale)],
	});
};

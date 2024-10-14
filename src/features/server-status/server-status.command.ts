import assert from "node:assert";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChannelSelectMenuBuilder,
	ChannelType,
	ChatInputCommandInteraction,
	InteractionContextType,
	ModalBuilder,
	PermissionsBitField,
	SlashCommandBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	TextInputBuilder,
	TextInputStyle,
	type SlashCommandStringOption,
} from "discord.js";
import { setChannel } from "#src/features/server-status/channel.ts";
import {
	addRegion,
	removeRegion,
	viewRegions,
} from "#src/features/server-status/region.ts";
import {
	disableNotifications,
	enableNotifications,
} from "#src/features/server-status/toggle.ts";
import type { CommandHandler } from "#src/utils/command.ts";
import { config } from "#src/utils/config.ts";
import i18n from "#src/utils/i18n.ts";
import { logger } from "#src/utils/logger.ts";
import {
	type GuildDetails,
	type OptionFunc,
	createGenericEmbed,
	guildCache,
	isAdminOrManager,
} from "#src/utils/misc.ts";

export const cooldown = 5;

const serverRegionOption: OptionFunc<SlashCommandStringOption> = (option) =>
	option
		.setName(i18n.t("option.serverRegion.name", { ns: "common", lng: "en" }))
		.setDescription(
			i18n.t("option.serverRegion.desc", { ns: "common", lng: "en" }),
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

export const builder = new SlashCommandBuilder()
	.setName(i18n.t("serverStatus.name", { ns: "commands", lng: "en" }))
	.setDescription(i18n.t("serverStatus.desc", { ns: "commands", lng: "en" }))
	.addSubcommand((subcommand) =>
		subcommand
			.setName(
				i18n.t("serverStatus.subcommands.enable.name", {
					ns: "commands",
					lng: "en",
				}),
			)
			.setDescription(
				i18n.t("serverStatus.subcommands.enable.desc", {
					ns: "commands",
					lng: "en",
				}),
			),
	)
	.addSubcommand((subcommand) =>
		subcommand
			.setName(
				i18n.t("serverStatus.subcommands.disable.name", {
					ns: "commands",
					lng: "en",
				}),
			)
			.setDescription(
				i18n.t("serverStatus.subcommands.disable.desc", {
					ns: "commands",
					lng: "en",
				}),
			),
	)
	.addSubcommand((subcommand) =>
		subcommand
			.setName(
				i18n.t("serverStatus.subcommands.channel.name", {
					ns: "commands",
					lng: "en",
				}),
			)
			.setDescription(
				i18n.t("serverStatus.subcommands.channel.desc", {
					ns: "commands",
					lng: "en",
				}),
			)
			.addChannelOption((option) =>
				option
					.setName(
						i18n.t("serverStatus.subcommands.channel.options.channel.name", {
							ns: "commands",
							lng: "en",
						}),
					)
					.setDescription(
						i18n.t("serverStatus.subcommands.channel.options.channel.desc", {
							ns: "commands",
							lng: "en",
						}),
					)
					.setRequired(true),
			),
	)
	.addSubcommand((subcommand) =>
		subcommand
			.setName(
				i18n.t("serverStatus.subcommands.setup.name", {
					ns: "commands",
					lng: "en",
				}),
			)
			.setDescription(
				i18n.t("serverStatus.subcommands.setup.desc", {
					ns: "commands",
					lng: "en",
				}),
			),
	)
	.addSubcommandGroup((group) =>
		group
			.setName(
				i18n.t("serverStatus.group.regions.name", {
					ns: "commands",
					lng: "en",
				}),
			)
			.setDescription(
				i18n.t("serverStatus.group.regions.desc", {
					ns: "commands",
					lng: "en",
				}),
			)
			.addSubcommand((subcommand) =>
				subcommand
					.setName(
						i18n.t("serverStatus.group.regions.subcommands.add.name", {
							ns: "commands",
							lng: "en",
						}),
					)
					.setDescription(
						i18n.t("serverStatus.group.regions.subcommands.add.desc", {
							ns: "commands",
							lng: "en",
						}),
					)
					.addStringOption(serverRegionOption),
			)
			.addSubcommand((subcommand) =>
				subcommand
					.setName(
						i18n.t("serverStatus.group.regions.subcommands.remove.name", {
							ns: "commands",
							lng: "en",
						}),
					)
					.setDescription(
						i18n.t("serverStatus.group.regions.subcommands.remove.desc", {
							ns: "commands",
							lng: "en",
						}),
					)
					.addStringOption(serverRegionOption),
			)
			.addSubcommand((subcommand) =>
				subcommand
					.setName(
						i18n.t("serverStatus.group.regions.subcommands.view.name", {
							ns: "commands",
							lng: "en",
						}),
					)
					.setDescription(
						i18n.t("serverStatus.group.regions.subcommands.view.desc", {
							ns: "commands",
							lng: "en",
						}),
					),
			),
	)
	.setContexts(InteractionContextType.Guild);

// Error handling, i18n, cleanup code?
async function setupWizard(
	cid: string,
	i: ChatInputCommandInteraction,
	cache: GuildDetails,
): Promise<void> {
	const regionOptions = config.albionServerRegions.map((region) => {
		return new StringSelectMenuOptionBuilder()
			.setLabel(
				i18n.t(
					`phrases.${region.toLowerCase() as "americas" | "asia" | "europe"}`,
					{ ns: "common", lng: i.locale },
				),
			)
			.setValue(region);
	});

	const regionSelector = new StringSelectMenuBuilder()
		.setCustomId("regionSelector")
		.setPlaceholder("Select one or more regions to track")
		.addOptions(regionOptions)
		.setMinValues(1)
		.setMaxValues(config.albionServerRegions.length);

	const regionRow =
		new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			regionSelector,
		);

	const regionResponse = await i.reply({
		components: [regionRow],
		ephemeral: true,
	});

	// catch this?
	const regionConfirmation = await regionResponse.awaitMessageComponent({
		filter: (mi) => mi.user.id === i.user.id,
		time: 60_000,
	});

	const createChannelButton = new ButtonBuilder()
		.setCustomId("createChannel")
		.setLabel("Create Channel")
		.setStyle(ButtonStyle.Primary);

	const selectChannelButton = new ButtonBuilder()
		.setCustomId("selectChannel")
		.setLabel("Select Channel")
		.setStyle(ButtonStyle.Primary);

	const channelRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
		selectChannelButton,
		createChannelButton,
	);

	const channelResponse = await regionConfirmation.update({
		content: "Where would you like the status notifications to go?",
		components: [channelRow],
	});

	// catch this?
	const channelConfirmation = await channelResponse.awaitMessageComponent({
		filter: (mi) => mi.user.id === i.user.id,
		time: 60_000,
	});

	if (channelConfirmation.customId === "createChannel") {
		const modal = new ModalBuilder()
			.setCustomId("createChannelModel")
			.setTitle("Channel Settings");

		const channelNameInput = new TextInputBuilder()
			.setCustomId("channelNameInput")
			.setLabel("Channel Name")
			.setStyle(TextInputStyle.Short)
			.setPlaceholder("server-status")
			.setRequired(true);

		const row = new ActionRowBuilder<TextInputBuilder>().addComponents(
			channelNameInput,
		);

		modal.addComponents(row);

		await channelConfirmation.showModal(modal);

		// catch this?
		const modalConfirmation = await channelConfirmation.awaitModalSubmit({
			time: 60_000,
		});

		// Typescript non-sense
		if (!modalConfirmation.isFromMessage()) return;

		await modalConfirmation.update({
			content: "Creating channel...",
			components: [],
		});

		const channelName =
			modalConfirmation.fields.getTextInputValue("channelNameInput");

		const newChannel = await i.guild?.channels.create({
			name: channelName,
			type: ChannelType.GuildText,
			permissionOverwrites: [
				{
					id: i.guild.roles.everyone,
					allow: [
						PermissionsBitField.Flags.ViewChannel,
						PermissionsBitField.Flags.ReadMessageHistory,
					],
					deny: [
						PermissionsBitField.Flags.SendMessages,
						PermissionsBitField.Flags.CreatePublicThreads,
						PermissionsBitField.Flags.CreatePrivateThreads,
						PermissionsBitField.Flags.EmbedLinks,
						PermissionsBitField.Flags.AttachFiles,
						PermissionsBitField.Flags.SendTTSMessages,
						PermissionsBitField.Flags.SendVoiceMessages,
						PermissionsBitField.Flags.SendPolls,
						PermissionsBitField.Flags.UseApplicationCommands,
						PermissionsBitField.Flags.UseEmbeddedActivities,
						PermissionsBitField.Flags.UseExternalApps,
					],
				},
			],
		});

		await modalConfirmation.editReply({
			content: `Created channel <#${newChannel?.id}>`,
		});
	} else {
		// TODO: present channel selector
	}
}

// TODO: if all regions removed, disable command and notify user
// TODO: if target channel is deleted, changed to non-text based, etc..., disable command and notify user
export const handler: CommandHandler = async ({ cid, i }) => {
	// Retreive cached guild
	const cachedGuild = guildCache.get(i.guildId ?? "");
	assert(cachedGuild, "Guild not found in cache");

	// Only server admins or managers can use these commands
	if (!isAdminOrManager(i.member, cachedGuild)) {
		logger.info({ cid }, "User lacks permission");
		await i.reply({
			content: "",
			ephemeral: true,
			embeds: [
				createGenericEmbed({
					title: " ",
					description: i18n.t("serverStatus.responses.noPermission", {
						ns: "commands",
						lng: i.locale,
					}),
					color: config.colors.warning,
				}),
			],
		});
		return;
	}

	// Extract subcommand options
	const subcommand = i.options.getSubcommand();
	const subcommandGroup = i.options.getSubcommandGroup();

	// Handle setup wizard
	if (subcommand === "setup") {
		await setupWizard(cid, i, cachedGuild);
		return;
	}

	// Initial deferral to prevent timeouts
	await i.deferReply({ ephemeral: true });

	// Handle add, remove, view regions
	if (subcommandGroup === "regions") {
		switch (subcommand) {
			case "add":
				await addRegion(cid, i, cachedGuild);
				break;
			case "remove":
				await removeRegion(cid, i, cachedGuild);
				break;
			case "view":
				await viewRegions(cid, i, cachedGuild);
				break;
		}

		return;
	}

	// Handle one of the other subcommands
	switch (subcommand) {
		case "enable":
			await enableNotifications(cid, i, cachedGuild);
			break;
		case "disable":
			await disableNotifications(cid, i, cachedGuild);
			break;
		case "channel":
			await setChannel(cid, i, cachedGuild);
			break;
	}
};

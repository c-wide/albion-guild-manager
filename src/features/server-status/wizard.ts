import { until } from "@open-draft/until";
import {
	ActionRowBuilder,
	ButtonBuilder,
	type ButtonInteraction,
	ButtonStyle,
	ChannelSelectMenuBuilder,
	ChannelType,
	type ChatInputCommandInteraction,
	ComponentType,
	ModalBuilder,
	PermissionsBitField,
	StringSelectMenuBuilder,
	type StringSelectMenuInteraction,
	StringSelectMenuOptionBuilder,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import { sql } from "drizzle-orm";
import { db } from "#src/database/db.ts";
import { serverSettings } from "#src/database/schema.ts";
import { type AlbionServerRegion, config } from "#src/utils/config.ts";
import i18n from "#src/utils/i18n.ts";
import { logger } from "#src/utils/logger.ts";
import {
	type GuildDetails,
	Settings,
	createGenericEmbed,
} from "#src/utils/misc.ts";

async function showRegionSelector(
	cid: string,
	i: ChatInputCommandInteraction<"cached">,
): Promise<StringSelectMenuInteraction | null> {
	// Configure server region options
	const options = config.albionServerRegions.map((region) => {
		return new StringSelectMenuOptionBuilder()
			.setLabel(
				i18n.t(
					`phrases.${region.toLowerCase() as "americas" | "asia" | "europe"}`,
					{ ns: "common", lng: i.locale },
				),
			)
			.setValue(region);
	});

	// Build multi select menu
	const menu = new StringSelectMenuBuilder()
		.setCustomId("regionSelector")
		.setPlaceholder(
			i18n.t("serverStatus.components.regionSelect.placeholder", {
				ns: "commands",
				lng: i.locale,
			}),
		)
		.addOptions(options)
		.setMinValues(1)
		.setMaxValues(config.albionServerRegions.length);

	// Create action row
	const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
		menu,
	);

	// Respond to user
	const res = await i.reply({
		content: i18n.t("serverStatus.responses.regionSelect", {
			ns: "commands",
			lng: i.locale,
		}),
		components: [row],
		ephemeral: true,
	});

	// Catch incase the user doesnt respond in time
	const { error, data } = await until(() =>
		res.awaitMessageComponent({
			filter: (mi) => mi.user.id === i.user.id,
			time: 60_000,
			componentType: ComponentType.StringSelect,
		}),
	);

	// If theres an error then delete the reply and bail
	if (error) {
		logger.info({ cid }, "User failed to respond");
		await i.deleteReply();
		return null;
	}

	// Return the interaction
	return data;
}

async function showChannelActions(
	cid: string,
	i: StringSelectMenuInteraction,
): Promise<ButtonInteraction | null> {
	// Create buttons
	const createChannelButton = new ButtonBuilder()
		.setCustomId("createChannel")
		.setLabel(
			i18n.t("serverStatus.components.channelActions.createChannel", {
				ns: "commands",
				lng: i.locale,
			}),
		)
		.setStyle(ButtonStyle.Primary);

	const selectChannelButton = new ButtonBuilder()
		.setCustomId("selectChannel")
		.setLabel(
			i18n.t("serverStatus.components.channelActions.selectChannel", {
				ns: "commands",
				lng: i.locale,
			}),
		)
		.setStyle(ButtonStyle.Primary);

	// Create action row
	const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
		selectChannelButton,
		createChannelButton,
	);

	// Send response to user
	const res = await i.update({
		content: i18n.t("serverStatus.responses.channelActionChoice", {
			ns: "commands",
			lng: i.locale,
		}),
		components: [row],
	});

	// Catch incase the user doesnt respond in time
	const { error, data } = await until(() =>
		res.awaitMessageComponent({
			filter: (mi) => mi.user.id === i.user.id,
			time: 60_000,
			componentType: ComponentType.Button,
		}),
	);

	// If there is an error then delete the respond
	if (error) {
		logger.info({ cid }, "User failed to respond");
		await i.deleteReply();
		return null;
	}

	// Return interaction
	return data;
}

async function createChannel(
	cid: string,
	i: ButtonInteraction,
): Promise<string | null> {
	// Create initial modal
	const modal = new ModalBuilder().setCustomId("createChannelModel").setTitle(
		i18n.t("serverStatus.components.createChannel.title", {
			ns: "commands",
			lng: i.locale,
		}),
	);

	// Create channel name input
	const nameInput = new TextInputBuilder()
		.setCustomId("channelNameInput")
		.setLabel(
			i18n.t("serverStatus.components.createChannel.nameInputLabel", {
				ns: "commands",
				lng: i.locale,
			}),
		)
		.setStyle(TextInputStyle.Short)
		.setPlaceholder(
			i18n.t("serverStatus.components.createChannel.nameInputPlaceholder", {
				ns: "commands",
				lng: i.locale,
			}),
		)
		.setRequired(true);

	// Create action row
	const row = new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput);

	// Add input to modal
	modal.addComponents(row);

	// Show modal to the user
	await i.showModal(modal);

	// Catch incase the user doesnt respond in time
	const { error, data } = await until(() =>
		i.awaitModalSubmit({
			time: 60_000,
		}),
	);

	// If error, delete reply and bail
	if (error) {
		logger.info({ cid }, "User failed to respond");
		await i.deleteReply();
		return null;
	}

	// Typescript non-sense
	if (!data.isFromMessage()) return null;

	// Update user were creating their channel
	await data.update({
		content: i18n.t("serverStatus.responses.creatingChannel", {
			ns: "commands",
			lng: i.locale,
		}),
		components: [],
	});

	// Actually create the channel
	const channel = await i.guild?.channels.create({
		name: data.fields.getTextInputValue("channelNameInput"),
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

	// This should only happpen if there was an error creating the channel
	// or the user closed the modal
	if (!channel) throw new Error("Failed to create channel");

	// Let the user know we created their channel successfully
	await data.editReply({
		content: i18n.t("serverStatus.responses.channelCreated", {
			channelId: channel.id,
			ns: "commands",
			lng: i.locale,
		}),
	});

	// Return the channel id
	return channel.id;
}

async function showChannelSelector(
	cid: string,
	i: ButtonInteraction,
): Promise<string | null> {
	// Create channel selector menu
	const menu = new ChannelSelectMenuBuilder()
		.setCustomId("channelSelector")
		.setPlaceholder(
			i18n.t("serverStatus.components.selectChannel.placeholder", {
				ns: "commands",
				lng: i.locale,
			}),
		)
		.setChannelTypes(ChannelType.GuildText);

	// Create action row
	const row = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
		menu,
	);

	// Send channel selector to the user
	const res = await i.update({
		content: i18n.t("serverStatus.responses.selectChannel", {
			ns: "commands",
			lng: i.locale,
		}),
		components: [row],
	});

	// Catch incase the user doesnt respond in time
	const { error, data } = await until(() =>
		res.awaitMessageComponent({
			filter: (mi) => mi.user.id === i.user.id,
			time: 60_000,
			componentType: ComponentType.ChannelSelect,
		}),
	);

	// If there is an error then delete reply and bail
	if (error) {
		logger.info({ cid }, "User failed to respond");
		await i.deleteReply();
		return null;
	}

	// Extract channel id
	const channelId = data.values[0];

	// Update user with the channel they selected
	await data.update({
		content: i18n.t("serverStatus.responses.channelSelected", {
			channelId,
			ns: "commands",
			lng: i.locale,
		}),
		components: [],
	});

	// Return the channel id
	return channelId;
}

async function showConfirmation(
	cid: string,
	i: ChatInputCommandInteraction<"cached">,
	regions: AlbionServerRegion[],
	channelId: string,
): Promise<ButtonInteraction | null> {
	// Create buttons
	const confirmButton = new ButtonBuilder()
		.setCustomId("confirm")
		.setLabel(
			i18n.t("phrases.confirm", {
				ns: "common",
				lng: i.locale,
			}),
		)
		.setStyle(ButtonStyle.Primary);

	const cancelButton = new ButtonBuilder()
		.setCustomId("cancel")
		.setLabel(i18n.t("phrases.cancel", { ns: "common", lng: i.locale }))
		.setStyle(ButtonStyle.Danger);

	// Create action row
	const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
		confirmButton,
		cancelButton,
	);

	// Send settings confirmation to user
	const res = await i.editReply({
		content: "",
		embeds: [
			createGenericEmbed({
				title: i18n.t("serverStatus.embeds.confirmation.title", {
					ns: "commands",
					lng: i.locale,
				}),
				description: " ",
				fields: [
					{
						name: i18n.t(
							"serverStatus.embeds.confirmation.fields.selectedRegions",
							{ ns: "commands", lng: i.locale },
						),
						value: regions.join("\n"),
						inline: true,
					},
					{
						name: i18n.t(
							"serverStatus.embeds.confirmation.fields.selectedChannel",
							{ ns: "commands", lng: i.locale },
						),
						value: `<#${channelId}>`,
						inline: true,
					},
				],
				color: config.colors.info,
			}),
		],
		components: [row],
	});

	// Catch this incase the user fails to respond
	const { error, data } = await until(() =>
		res.awaitMessageComponent({
			filter: (mi) => mi.user.id === i.user.id,
			time: 60_000,
			componentType: ComponentType.Button,
		}),
	);

	// If theres an error then delete the reply and bail
	if (error) {
		logger.info({ cid }, "User failed to respond");
		await i.deleteReply();
		return null;
	}

	// Return the response
	return data;
}

export async function setupWizard(
	cid: string,
	i: ChatInputCommandInteraction<"cached">,
	cache: GuildDetails,
): Promise<void> {
	// Which regions does the user want to track
	const regionSelectRes = await showRegionSelector(cid, i);
	if (!regionSelectRes) return;

	// Does the user want us to create a new channel or select an existing channel
	const channelActionRes = await showChannelActions(cid, regionSelectRes);
	if (!channelActionRes) return;

	// Create channel or show channel selector
	let channelId: string | null = null;
	if (channelActionRes.customId === "createChannel") {
		channelId = await createChannel(cid, channelActionRes);
	} else {
		channelId = await showChannelSelector(cid, channelActionRes);
	}

	// This shouldnt happen unless the user closes the modal
	if (!channelId) throw new Error("Channel ID is null");

	// Show confirmation before saving
	const regions = regionSelectRes.values as AlbionServerRegion[];
	const confirmationRes = await showConfirmation(cid, i, regions, channelId);
	if (!confirmationRes) return;

	// Handle confirmation cancel option
	if (confirmationRes.customId === "cancel") {
		logger.info({ cid }, "User cancelled setup");
		await i.deleteReply();
		if (
			channelActionRes.customId === "createChannel" &&
			i.guild?.channels.cache.has(channelId)
		) {
			await i.guild.channels.delete(channelId);
		}
		return;
	}

	// Handle confirmation confirm option
	//
	// Update db
	await db
		.insert(serverSettings)
		.values([
			{
				serverId: cache.id,
				key: Settings.ServerStatusRegions,
				value: regions,
			},
			{
				serverId: cache.id,
				key: Settings.ServerStatusChannel,
				value: `snowflake_${channelId}`,
			},
			{
				serverId: cache.id,
				key: Settings.ServerStatusToggle,
				value: true,
			},
		])
		.onConflictDoUpdate({
			target: [serverSettings.serverId, serverSettings.key],
			set: {
				value: sql.raw(`excluded.${serverSettings.value.name}`),
				updatedAt: new Date(),
			},
		});

	// Update cache
	cache.settings.set(Settings.ServerStatusRegions, regions);
	cache.settings.set(Settings.ServerStatusChannel, channelId);
	cache.settings.set(Settings.ServerStatusToggle, true);

	// Log things
	logger.info({ cid, regions, channelId }, "Setup wizard completed");

	// Inform the user of success
	await i.editReply({
		content: " ",
		embeds: [
			createGenericEmbed({
				title: i18n.t("serverStatus.embeds.completed.title", {
					ns: "commands",
					lng: i.locale,
				}),
				description: i18n.t("serverStatus.embeds.completed.desc", {
					channelId,
					ns: "commands",
					lng: i.locale,
				}),
				color: config.colors.success,
			}),
		],
		components: [],
	});
}

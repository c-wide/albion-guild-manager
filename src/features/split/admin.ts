import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	ComponentType,
} from "discord.js";
import { createGenericEmbed, type GuildDetails } from "#src/utils/misc.ts";
import { config } from "#src/utils/config.ts";
import { until } from "@open-draft/until";

async function handlePayout(
	cid: string,
	i: ChatInputCommandInteraction<"cached">,
	cache: GuildDetails,
) {
	// Extract options
	const amount = i.options.getInteger("amount", true);
	const user = i.options.getUser("user", true);

	// Create buttons for confirming or canceling the payout
	const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setCustomId("confirm")
			.setLabel("Confirm")
			.setStyle(ButtonStyle.Primary),
		new ButtonBuilder()
			.setCustomId("cancel")
			.setLabel("Cancel")
			.setStyle(ButtonStyle.Danger),
	);

	// Send a message with the confirmation embed and buttons
	const confirmMsg = await i.followUp({
		content: "",
		embeds: [
			createGenericEmbed({
				title: "Payout",
				description: `Are you sure you want to pay out ${amount} silver to <@${user.id}>?`,
				color: config.colors.info,
			}),
		],
		components: [confirmRow],
	});

	// Wait for the user to confirm or cancel
	const { error: confirmErr, data: confirmData } = await until(() =>
		confirmMsg.awaitMessageComponent({
			filter: (mi) => mi.user.id === i.user.id,
			time: 3 * 60_000,
			componentType: ComponentType.Button,
		}),
	);

	// If there was an error or cancelation, delete the confirmation message and return early
	if (confirmErr || confirmData.customId === "cancel") {
		await i.deleteReply();
		return;
	}
}

export async function handleAdminActions(
	cid: string,
	i: ChatInputCommandInteraction<"cached">,
	cache: GuildDetails,
) {
	switch (i.options.getSubcommand()) {
		case "payout": {
			await handlePayout(cid, i, cache);
			break;
		}
		case "view_balance": {
			break;
		}
		case "set_balance": {
			break;
		}
		case "set_manager_role": {
			break;
		}
	}
}

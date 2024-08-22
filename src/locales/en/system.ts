export const system = {
	error: {
		generic: {
			title: "Uh Oh! Something Went Wrong!",
			footer:
				"If you continue to experience this issue, please visit our [Discord]({{url}}) for assistance.",
		},
	},
	command: {
		cooldown: {
			title: "Whoa! You're Fast!",
			desc: 'Please wait, you are on a cooldown for the "{{commandName}}" command. You can use it again <t:{{discordTimestamp}}:R>.',
		},
		error: {
			generic: "An error occurred while handling the command",
			unknown: "The command you attempted to use does not exist",
		},
	},
} as const;

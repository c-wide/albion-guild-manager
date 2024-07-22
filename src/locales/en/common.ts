export const common = {
	commandUnknown: "The command you attempted to use does not exist",
	commandCooldown:
		'Please wait, you are on a cooldown for the "{{commandName}}" command. You can use it again <t:{{discordTimestamp}}:R>.',
	commandGenericError: "An error occurred while handling the command",
	"cmd-utc-name": "utc",
	"cmd-utc-desc": "Get the current UTC time",
	"cmd-utc-response": ":clock3: **{{utcTime}}**",
} as const;

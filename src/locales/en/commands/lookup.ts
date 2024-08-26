export const lookup = {
	name: "lookup",
	desc: "Retrieve detailed information about a player, guild, or alliance",
	subcommands: {
		player: {
			name: "player",
			desc: "Retrieve detailed information about a player",
		},
		guild: {
			name: "guild",
			desc: "Retrieve detailed information about a guild",
		},
		alliance: {
			name: "alliance",
			desc: "Retrieve detailed information about an alliance",
		},
	},
	option: {
		searchTerm: {
			name: "search_term",
			desc: "The name of the player, guild, or alliance to search for",
		},
	},
	response: {
		searching: "Searching for {{entityType}} details...",
		selectEntity: "Select the {{entityType}} you want to search for",
	},
} as const;

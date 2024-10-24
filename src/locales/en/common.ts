export const common = {
	phrases: {
		americas: "Americas",
		asia: "Asia",
		europe: "Europe",
		na: "N/A",
		correlationId: "Correlation ID",
		confirm: "Confirm",
		cancel: "Cancel",
	},
	options: {
		isPublic: {
			name: "is_public",
			desc: "Should the command response should be publicly visible",
		},
		serverRegion: {
			name: "server_region",
			desc: "Which Albion Online server to target",
		},
	},
	responses: {
		killboardErr:
			"We encountered an error while interacting with the Albion Online API. Please try again...\n\n*The API for the Americas server is usually under heavy load which causes requests to frequently time out*",
	},
} as const;

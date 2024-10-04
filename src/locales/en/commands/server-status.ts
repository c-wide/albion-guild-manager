export const serverStatus = {
	embeds: {
		serverStatus: {
			title: "{{region}} Server Status",
			fields: {
				status: {
					name: "Status",
					online: "Online",
					offline: "Offline",
				},
				timestamp: {
					name: "Timestamp",
				},
			},
		},
	},
} as const;

export const managers = {
	name: "managers",
	desc: "Manage bot administrator roles and users",
	group: {
		add: {
			name: "add",
			desc: "Grant bot management permissions",
			subcommands: {
				role: {
					name: "role",
					desc: "Grant bot management permissions to a role",
					options: {
						role: {
							name: "role",
							desc: "The role to be granted bot management permissions",
						},
					},
				},
				user: {
					name: "user",
					desc: "Grant bot management permissions to a user",
					options: {
						user: {
							name: "user",
							desc: "The user to be granted bot management permissions",
						},
					},
				},
			},
		},
		remove: {
			name: "remove",
			desc: "Revoke bot management permissions",
			subcommands: {
				role: {
					name: "role",
					desc: "Revoke bot management permissions from a role",
					options: {
						role: {
							name: "role",
							desc: "The role to have its bot management permissions revoked",
						},
					},
				},
				user: {
					name: "user",
					desc: "Revoke bot management permissions from a user",
					options: {
						user: {
							name: "user",
							desc: "The user to have their bot management permissions revoked",
						},
					},
				},
			},
		},
	},
	subcommands: {
		view: {
			name: "view",
			desc: "Display current bot managers",
		},
	},
	embeds: {
		common: {
			na: "N/A",
		},
		botManagers: {
			title: "Current Bot Managers",
			fields: {
				roles: {
					name: "Manager Roles",
				},
				users: {
					name: "Manager Users",
				},
			},
		},
	},
	responses: {
		noPermission:
			"You don't have the required permissions to manage bot administrators",
		viewErr:
			"An error occurred while retrieving the list of bot managers. Please try again later",
		updateErr:
			"An error occurred while updating bot managers. Please check your input and try again later",
		addRole:
			"The role <@&{{target}}> has been granted bot management permissions",
		addUser:
			"The user <@{{target}}> has been granted bot management permissions",
		removeRole:
			"Bot management permissions have been revoked from the role <@&{{target}}>",
		removeUser:
			"Bot management permissions have been revoked from the user <@{{target}}>",
		roleAlreadyManager: "<@&{{target}}> already has bot management permissions",
		userAlreadyManager: "<@{{target}}> already has bot management permissions",
		roleNotManager:
			"<@&{{target}}> doesn't currently have bot management permissions",
		userNotManager:
			"<@{{target}}> doesn't currently have bot management permissions",
		noManagers: "There are currently no bot managers configured",
	},
} as const;

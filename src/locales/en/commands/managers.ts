export const managers = {
	name: "managers",
	desc: "Manage bot administrators",
	subcommands: {
		setRole: {
			name: "set_role",
			desc: "Grant bot management permissions to a role",
			options: {
				role: {
					name: "role",
					desc: "The role to grant bot management permissions to",
				},
			},
		},
	},
	responses: {
		noPermission:
			"You don't have the required permissions to manage bot administrators",
		confirmSetRole:
			"Are you sure you want to grant bot management permissions to the role <@&{{roleId}}>",
		setRole:
			"The role <@&{{roleId}}> has been granted bot management permissions",
	},
} as const;

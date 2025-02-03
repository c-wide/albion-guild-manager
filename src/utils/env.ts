import { z } from "zod";

const envSchema = z
	.object({
		DATABASE_URL: z.string().url(),
		DISCORD_TOKEN: z.string(),
		DISCORD_CLIENT_ID: z.string(),
		DISCORD_GUILD_ID: z.string().optional(),
		PINO_PRETTY: z.enum(["true", "false"]),
		AXIOM_TOKEN: z.string().optional(),
		AXIOM_DATASET: z.string().optional(),
	})
	.refine(
		(data) => {
			return (
				(data.AXIOM_TOKEN === undefined && data.AXIOM_DATASET === undefined) ||
				(data.AXIOM_TOKEN !== undefined && data.AXIOM_DATASET !== undefined)
			);
		},
		{
			message: "AXIOM_TOKEN and AXIOM_DATASET must be provided together",
			path: ["AXIOM_TOKEN", "AXIOM_DATASET"],
		},
	);

export type Env = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);

import { z } from "zod";

const envSchema = z
	.object({
		DATABASE_URL: z.string().url(),
		DISCORD_TOKEN: z.string(),
		DISCORD_CLIENT_ID: z.string(),
		DISCORD_GUILD_ID: z.string().optional(),
		PINO_PRETTY: z.enum(["true", "false"]),
		AXIOM_TOKEN: z.string().optional(),
		AXIOM_ORG_ID: z.string().optional(),
		AXIOM_DATASET: z.string().optional(),
	})
	.refine(
		(data) => {
			if (data.AXIOM_TOKEN) {
				return !!data.AXIOM_ORG_ID && !!data.AXIOM_DATASET;
			}
			return true;
		},
		{
			message:
				"If AXIOM_TOKEN is provided, AXIOM_ORG_ID and AXIOM_DATASET must also be provided",
			path: ["AXIOM_TOKEN"],
		},
	);

export type Env = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);

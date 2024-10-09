import type { Config } from "drizzle-kit";
import { env } from "#src/utils/env.ts";

const config: Config = {
	schema: "./src/database/schema.ts",
	out: "./src/database/migrations",
	dialect: "postgresql",
	dbCredentials: {
		url: env.DATABASE_URL,
	},
};

export default config;

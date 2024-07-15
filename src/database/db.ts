import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { env } from "~/utils/env";

const client = postgres(env.DATABASE_URL);

export const db = drizzle(client);

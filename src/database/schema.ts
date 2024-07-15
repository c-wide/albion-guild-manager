import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const servers = pgTable("servers", {
	id: uuid("id").defaultRandom().primaryKey(),
	serverId: text("server_id").notNull(),
	name: text("name").notNull(),
	joinedAt: timestamp("joined_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	leftAt: timestamp("left_at", { withTimezone: true }),
});

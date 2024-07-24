import {
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

export const servers = pgTable("servers", {
	id: uuid("id").defaultRandom().primaryKey(),
	serverId: varchar("server_id", { length: 20 }).notNull(),
	name: text("name").notNull(),
	nameAcronym: text("name_acronym").notNull(),
	iconURL: text("icon_url"),
	bannerURL: text("banner_url"),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
	joinedAt: timestamp("joined_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	leftAt: timestamp("left_at", { withTimezone: true }),
});

export const serverSettings = pgTable(
	"server_settings",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		serverId: uuid("server_id")
			.notNull()
			.references(() => servers.id),
		key: text("key").notNull(),
		value: text("value").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
	},
	(t) => ({
		unq: unique().on(t.serverId, t.key),
	}),
);

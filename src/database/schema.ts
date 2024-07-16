import {
	pgEnum,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";

export const servers = pgTable("servers", {
	id: uuid("id").defaultRandom().primaryKey(),
	serverId: text("server_id").notNull(),
	name: text("name").notNull(),
	joinedAt: timestamp("joined_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	leftAt: timestamp("left_at", { withTimezone: true }),
});

export const dataTypeEnum = pgEnum("data_type", [
	"string",
	"number",
	"boolean",
	"json",
]);

export const serverSettings = pgTable(
	"server_settings",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		serverId: uuid("server_id")
			.notNull()
			.references(() => servers.id),
		key: text("key").notNull(),
		value: text("value").notNull(),
		dataType: dataTypeEnum("data_type").notNull(),
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

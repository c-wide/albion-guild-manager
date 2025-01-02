import {
	bigint,
	jsonb,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { v7 } from "uuid";

export const servers = pgTable("servers", {
	id: uuid("id")
		.primaryKey()
		.$defaultFn(() => v7()),
	guildId: varchar("guild_id", { length: 25 }).notNull(),
	joinedAt: timestamp("joined_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	leftAt: timestamp("left_at", { withTimezone: true }),
});

export const serverSettings = pgTable(
	"server_settings",
	{
		id: uuid("id")
			.primaryKey()
			.$defaultFn(() => v7()),
		serverId: uuid("server_id")
			.notNull()
			.references(() => servers.id),
		key: text("key").notNull(),
		value: jsonb("value").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
	},
	(t) => [unique().on(t.serverId, t.key)],
);

export const lootSplitBalances = pgTable(
	"loot_split_balances",
	{
		id: uuid("id")
			.primaryKey()
			.$defaultFn(() => v7()),
		serverId: uuid("server_id")
			.notNull()
			.references(() => servers.id),
		memberId: varchar("member_id", { length: 25 }).notNull(),
		balance: bigint("balance", { mode: "number" }).notNull(),
	},
	(t) => [unique().on(t.serverId, t.memberId)],
);

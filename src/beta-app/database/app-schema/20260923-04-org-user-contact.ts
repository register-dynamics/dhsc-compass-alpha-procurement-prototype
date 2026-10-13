import { Kysely, sql } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("app.organisation_contact").execute();
  await db.schema.dropTable("app.organisation_user").execute();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("app.organisation_user")
    .addColumn("organisation_id", "integer", (col) =>
      col.references("app.organisations.organisation_id").notNull(),
    )
    .addColumn("user_id", "integer", (col) =>
      col.references("app.users.id").notNull(),
    )
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .execute();

  await db.schema
    .createIndex("organisation_user_pk")
    .on("app.organisation_user")
    .column("organisation_id")
    .column("user_id")
    .unique()
    .execute();

  await db.schema
    .createTable("app.organisation_contact")
    .addColumn("organisation_id", "integer", (col) =>
      col.references("app.organisations.organisation_id").notNull(),
    )
    .addColumn("contact_id", "integer", (col) =>
      col.references("app.contacts.contact_id").notNull(),
    )
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .execute();

  await db.schema
    .createIndex("organisation_contact_pk")
    .on("app.organisation_contact")
    .column("organisation_id")
    .column("contact_id")
    .unique()
    .execute();
}

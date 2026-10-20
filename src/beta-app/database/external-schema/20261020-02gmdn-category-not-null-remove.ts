import { Kysely } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("external.gmdn_category")
    .alterColumn("category_code", (ac) =>
      ac.setNotNull(),
    )
    .execute();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("external.gmdn_category")
    .alterColumn("category_code", (ac) =>
      ac.dropNotNull(),
    )
    .execute();
}

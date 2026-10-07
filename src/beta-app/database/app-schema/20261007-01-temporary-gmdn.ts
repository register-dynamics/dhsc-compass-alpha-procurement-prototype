import { Kysely, sql } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("app.gmdn_categories").execute();
  await db.schema.dropTable("app.gmdn_category_term_links").execute();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {

  await db.schema
    .createTable("app.gmdn_category_term_links")
    .addColumn("gmdn_category_code", "varchar", (col) => col.notNull())
    .addColumn("gmdn_code", "integer", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("app.gmdn_categories")
    .addColumn("id", "varchar", (col) => col.primaryKey())
    .addColumn("gmdn_category_code", "varchar")
    .addColumn("name", "varchar", (col) => col.notNull())
    .addColumn("definition", "varchar", (col) => col.notNull())
    .addColumn("parent_id", "varchar", (col) => col.references("app.gmdn_categories.id"))
    .execute();
}

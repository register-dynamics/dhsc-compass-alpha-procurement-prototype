import { Kysely, sql } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("external.gmdn_category")
  await db.schema.dropTable("external.gmdn_category_term")
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("external.gmdn_category")
    .addColumn("nodeID", "varchar", (col) => col.primaryKey())
    .addColumn("category_code", "varchar", (col) => col.notNull())
    .addColumn("path", "varchar", (col) => col.notNull())
    .addColumn("name", "varchar", (col) => col.notNull())
    .addColumn("definition", "varchar", (col) => col.notNull())
    .addColumn("parent_id", "varchar")
    .addColumn("top_id", "varchar")
    .execute();

  await db.schema
    .createTable("external.gmdn_category_term")
    .addColumn("category_code", "varchar", (col) => col.notNull())
    .addColumn("term_code", "varchar", (col) => col.notNull())
    .addPrimaryKeyConstraint("gmdn_category_term_pk", ["category_code", "term_code"])
    .execute();
}

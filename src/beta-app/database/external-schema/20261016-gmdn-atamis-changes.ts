import { Kysely, sql } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("external.atamis_to_gmdn").execute();

  await db.schema
    .createTable("external.category_to_gmdn")
    .addColumn("category", "varchar", (col) => col.notNull())
    .addColumn("gmdn_code", "integer", (col) => col.notNull())
    .addPrimaryKeyConstraint("category_to_gmdn_pk", ["category", "gmdn_code"])
    .execute();

  await db.schema
    .alterTable("external.products")
    .dropColumn("aggregation_type")
    .execute();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("external.category_to_gmdn").execute();

  await db.schema
    .createTable("external.atamis_to_gmdn")
    .addColumn("atamis_ref", "varchar", (col) => col.notNull())
    .addColumn("gmdn_code", "integer", (col) => col.notNull())
    .addPrimaryKeyConstraint("atamis_to_gmdn_pk", ["atamis_ref", "gmdn_code"])
    .execute();

  await db.schema
    .alterTable("external.products")
    .addColumn("aggregation_type", "varchar")
    .execute();
}

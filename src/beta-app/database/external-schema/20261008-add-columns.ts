import { Kysely, sql } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("external.manufacturers")
    .removeColumn("company_regestration_number")
    .exeute();  

  await db.schema
    .alterTable("external.products")
    .removeColumn("aggregation_name")
    .execute();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("external.manufacturers")
    .addColumn("company_regestration_number", "varchar")
    .execute();

  await db.schema
    .alterTable("external.products")
    .addColumn("aggregation_name", "varchar")
    .execute();
}

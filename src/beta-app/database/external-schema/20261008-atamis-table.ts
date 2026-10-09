import { Kysely } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("external.atamis_pipeline").execute();
  await db.schema.dropTable("external.atamis_contracts").execute();
  await db.schema.dropTable("external.contracts_to_mhra_manufacturers").execute();
  await db.schema.dropTable("external.category_to_gmdn").execute();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("external.atamis_pipeline")
    .addColumn("ref_no", "varchar", (col) => col.primaryKey())
    .addColumn("workplan_name", "varchar", (col) => col.notNull())
    .addColumn("contracting_authority", "varchar", (col) => col.notNull())
    .addColumn("business_unit", "varchar")
    .addColumn("bu_contact", "varchar")
    .addColumn("description", "varchar")
    .addColumn("commercial_lead", "varchar")
    .addColumn("existing_supplier", "varchar")
    .addColumn("expected_start_date", "date")
    .addColumn("cpv_category", "varchar")
    .addColumn("alt_category", "varchar")
    .addColumn("delivery_lead", "varchar")
    .execute();

  await db.schema
    .createTable("external.atamis_contracts")
    .addColumn("contract_ref", "varchar", (col) => col.primaryKey())
    .addColumn("contract_name", "varchar", (col) => col.notNull())
    .addColumn("description", "varchar", (col) => col.notNull())
    .addColumn("owner", "varchar", (col) => col.notNull())
    .addColumn("status", "varchar", (col) => col.notNull())
    .addColumn("supplier", "varchar", (col) => col.notNull())
    .addColumn("company_regestration_number", "integer")
    .addColumn("DUNS", "integer")
    .addColumn("contracting_authority", "varchar", (col) => col.notNull())
    .addColumn("business_unit", "varchar")
    .addColumn("primary_category", "varchar", (col) => col.notNull())
    .addColumn("secondary_category", "varchar")
    .addColumn("start_date", "date", (col) => col.notNull())
    .addColumn("end_date", "date", (col) => col.notNull())
    .addColumn("contract_finder_url", "varchar")
    .execute();

  await db.schema
    .createTable("external.contracts_to_mhra_manufacturers")
    .addColumn("contract_ref", "varchar", (col) => col.notNull())
    .addColumn("manufacturer_id", "integer", (col) => col.notNull())
    .addPrimaryKeyConstraint("contracts_to_mhra_manufacturers_pk", [
      "contract_ref",
      "manufacturer_id",
    ])
    .execute();

  await db.schema
    .createTable("external.category_to_gmdn")
    .addColumn("category", "varchar", (col) => col.notNull())
    .addColumn("gmdn_code", "integer", (col) => col.notNull())
    .addPrimaryKeyConstraint("category_to_gmdn_pk", ["category", "gmdn_code"])
    .execute();
}

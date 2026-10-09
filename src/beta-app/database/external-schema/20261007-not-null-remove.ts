import { Kysely, sql } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("external.manufacturers")
    .alterColumn("man_country", (ac) => ac.setNotNull())
    .alterColumn("man_organisation_type", (ac) => ac.setNotNull())
    .execute();

  await db.schema
    .alterTable("external.device_type")
    .alterColumn("gmdn_code", (ac) => ac.setNotNull()
    )
    .alterColumn("device_risk_sub_type", (ac) => ac.setNotNull())
    .execute();

  await db.schema
    .alterTable("external.products")
    .alterColumn("udi_number", (ac) => ac.setNotNull())
    .alterColumn("brand_trade_name", (ac) => ac.setNotNull())
    .alterColumn("model", (ac) => ac.setNotNull())
    .alterColumn("product_code", (ac) => ac.setNotNull())
    .execute();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("external.manufacturers")
    .alterColumn("man_country", (ac) => ac.dropNotNull())
    .alterColumn("man_organisation_type", (ac) => ac.dropNotNull())
    .execute();

  await db.schema
    .alterTable("external.device_type")
    .alterColumn("gmdn_code", (ac) => ac.dropNotNull()
    )
    .alterColumn("device_risk_sub_type", (ac) => ac.dropNotNull())
    .execute();

  await db.schema
    .alterTable("external.products")
    .alterColumn("udi_number", (ac) => ac.dropNotNull())
    .alterColumn("brand_trade_name", (ac) => ac.dropNotNull())
    .alterColumn("model", (ac) => ac.dropNotNull())
    .alterColumn("product_code", (ac) => ac.dropNotNull())
    .execute();
}

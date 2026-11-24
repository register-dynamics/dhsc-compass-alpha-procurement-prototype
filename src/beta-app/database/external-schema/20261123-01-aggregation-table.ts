import { Kysely, sql } from "kysely";

import { up as createOldAggregationView } from "./20261110-aggregation-search-by-supplier.js";
import { up as createOldDeviceView } from "./20261112-device-type-search-view.js";


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("external.products")
    .addColumn("aggregation_name", "varchar")
    .addColumn("aggregation_type", "varchar")
    .dropColumn("aggregation_id")
    .execute();
  await db.schema
    .dropTable("external.aggregation")
    .execute();
  await createOldAggregationView(db);
  await createOldDeviceView(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db
    .withSchema("external")
    .schema.dropView("aggregation_search")
    .materialized()
    .ifExists()
    .execute();
  await db
    .withSchema("external")
    .schema.dropView("device_type_search")
    .materialized()
    .ifExists()
    .execute();
  

  await db.schema
    .createTable("external.aggregation")
    .addColumn("aggregation_id", "integer", (col) => col.primaryKey())
    .addColumn("device_id", "integer", (col) =>
      col.references("external.device_type.device_id").notNull(),)
    .addColumn("manufacturer_id", "integer", (col) =>
      col.references("external.manufacturers.manufacturer_id").notNull(),)
    .addColumn("aggregation_name", "varchar", (col) => col.notNull())
    .addColumn("aggregation_type", "varchar", (col) => col.notNull())
    .execute();

  await db.schema
    .alterTable("external.products")
    .dropColumn("aggregation_name")
    .dropColumn("aggregation_type")
    .addColumn("aggregation_id", "integer", (col) =>
      col.references("external.aggregation.aggregation_id").notNull(),)
    .execute();
}

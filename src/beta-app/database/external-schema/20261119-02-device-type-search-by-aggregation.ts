import { Kysely, sql } from "kysely";

import { up as createDeviceTypeSupplierView } from "./20261112-device-type-search-view.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await dropView(db);
  await createDeviceTypeSupplierView(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await dropView(db);

  // One row per GMDN term (device type), supplier and aggregation name. A
  // supplier's aggregation can span several device types (e.g. a "series"
  // with a spirometer, a plethysmograph and a pulmonary function analyser,
  // each registered as its own device), so each device type it covers gets
  // its own row, holding only the products of that type. Several device_ids
  // can share a GMDN term within an aggregation, so they're collected into
  // device_ids rather than split into separate rows.
  //
  // The search_doc is built from the GMDN term name, the aggregation name and
  // the brand/trade names and models of every product in the row, so searches
  // match on device type or product, but not on supplier.
  //
  // Unlike createTable, createView doesn't work nicely if you give it a name with a schema in, so use withSchema
  await db
    .withSchema("external")
    .schema.createView("device_type_search")
    .materialized()
    .as(
      db
        .selectFrom("external.device_type as t")
        .innerJoin("external.gmdn as g", "g.gmdn_code", "t.gmdn_code")
        .innerJoin(
          "external.manufacturers as m",
          "m.manufacturer_id",
          "t.manufacturer_id",
        )
        .innerJoin("external.products as p", "p.device_id", "t.device_id")
        .where("p.aggregation_name", "is not", null)
        .groupBy([
          "g.gmdn_code",
          "g.gmdn_term_name",
          "m.manufacturer_id",
          "m.man_organisation_name",
          "p.aggregation_name",
        ])
        .select([
          "g.gmdn_code as gmdn_code",
          "g.gmdn_term_name as gmdn_term_name",
          "m.manufacturer_id as manufacturer_id",
          "m.man_organisation_name as manufacturer_name",
          "p.aggregation_name as aggregation_name",
        ])
        .select(sql<string>`min(p.aggregation_type)`.as("aggregation_type"))
        .select(
          sql<number>`count(DISTINCT p.product_id)::integer`.as(
            "product_count",
          ),
        )
        .select(arrayAgg("t.device_id").as("device_ids"))
        .select(arrayAgg("p.brand_trade_name").as("brand_trade_names"))
        .select(arrayAgg("p.model").as("models"))
        .select(arrayAgg("p.product_code").as("product_codes"))
        .select(
          sql<string>`
            to_tsvector(
              'english',
              concat_ws(
                ' ',
                g.gmdn_term_name,
                p.aggregation_name,
                string_agg(
                  DISTINCT concat_ws(' ', p.brand_trade_name, p.model),
                  ' '
                )
              )
            )
          `.as("search_doc"),
        ),
    )
    .execute();

  // Unique index lets the view be refreshed with REFRESH MATERIALIZED VIEW CONCURRENTLY
  await db.schema
    .createIndex("device_type_search_gmdn_code_manufacturer_id_aggregation")
    .on("external.device_type_search")
    .unique()
    .columns(["gmdn_code", "manufacturer_id", "aggregation_name"])
    .execute();

  await db.schema
    .createIndex("device_type_search_fts")
    .on("external.device_type_search")
    .using("GIN")
    .column("search_doc")
    .execute();
}

// Dropping the view also drops its indexes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dropView = async (db: Kysely<any>) => {
  await db
    .withSchema("external")
    .schema.dropView("device_type_search")
    .materialized()
    .ifExists()
    .execute();
};

// Distinct, non-null values of a column across the row, as an empty array
// rather than null when there are none
const arrayAgg = (column: string) =>
  sql`coalesce(array_agg(DISTINCT ${sql.ref(column)}) FILTER (WHERE ${sql.ref(column)} IS NOT NULL), '{}')`;

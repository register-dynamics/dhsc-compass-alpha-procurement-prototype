import { Kysely, sql } from "kysely";

import { up as createAggregationOnlyView } from "./20261103-aggregation-search-view.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await dropView(db);
  await createAggregationOnlyView(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await dropView(db);

  // One row per aggregation_name and manufacturer. Different suppliers can use
  // the same aggregation name for unrelated products, so they're kept apart.
  // Fields that can differ between the products in a row are collected into
  // arrays, and the search_doc is built from every product in the row so any
  // of their terms will match.
  //
  // Unlike createTable, createView doesn't work nicely if you give it a name with a schema in, so use withSchema
  await db
    .withSchema("external")
    .schema.createView("aggregation_search")
    .materialized()
    .as(
      db
        .selectFrom("external.products as p")
        .leftJoin("external.device_type as t", "p.device_id", "t.device_id")
        .leftJoin(
          "external.manufacturers as m",
          "p.manufacturer_id",
          "m.manufacturer_id",
        )
        // Left join (unlike external.search) so products without a GMDN code
        // don't drop out of their aggregation
        .leftJoin("external.gmdn as g", "t.gmdn_code", "g.gmdn_code")
        .where("p.aggregation_name", "is not", null)
        .groupBy([
          "p.aggregation_name",
          "p.manufacturer_id",
          "m.man_organisation_name",
          "m.man_country",
        ])
        .select([
          "p.aggregation_name as aggregation_name",
          "p.manufacturer_id as manufacturer_id",
          "m.man_organisation_name as manufacturer_name",
          "m.man_country as manufacturer_country",
        ])
        .select(sql<string>`min(p.aggregation_type)`.as("aggregation_type"))
        .select(sql<number>`count(*)::integer`.as("product_count"))
        .select(arrayAgg("p.brand_trade_name").as("product_names"))
        .select(arrayAgg("p.model").as("models"))
        .select(arrayAgg("p.product_code").as("product_codes"))
        .select(arrayAgg("t.gmdn_code").as("gmdn_codes"))
        .select(arrayAgg("g.gmdn_term_name").as("gmdn_names"))
        .select(arrayAgg("t.device_type_name").as("types"))
        // Join all the things we'd like free text searches to match on, across
        // every product in the row
        .select(
          sql<string>`
            to_tsvector(
              'english',
              concat_ws(
                ' ',
                p.aggregation_name,
                m.man_organisation_name,
                m.man_country,
                string_agg(
                  DISTINCT concat_ws(
                    ' ',
                    p.product_id,
                    t.device_id,
                    p.brand_trade_name,
                    p.model,
                    p.product_code,
                    g.gmdn_term_name,
                    t.device_type_name,
                    p.udi_number,
                    t.gmdn_code
                  ),
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
    .createIndex("aggregation_search_aggregation_name_manufacturer_id")
    .on("external.aggregation_search")
    .unique()
    .columns(["aggregation_name", "manufacturer_id"])
    .execute();

  await db.schema
    .createIndex("aggregation_search_fts")
    .on("external.aggregation_search")
    .using("GIN")
    .column("search_doc")
    .execute();
}

// Dropping the view also drops its indexes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dropView = async (db: Kysely<any>) => {
  await db
    .withSchema("external")
    .schema.dropView("aggregation_search")
    .materialized()
    .ifExists()
    .execute();
};

// Distinct, non-null values of a column across the row, as an empty array
// rather than null when there are none
const arrayAgg = (column: string) =>
  sql`coalesce(array_agg(DISTINCT ${sql.ref(column)}) FILTER (WHERE ${sql.ref(column)} IS NOT NULL), '{}')`;

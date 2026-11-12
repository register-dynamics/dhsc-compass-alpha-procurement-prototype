import { Kysely, sql } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  // Dropping the view also drops its indexes
  await db
    .withSchema("external")
    .schema.dropView("device_type_search")
    .materialized()
    .ifExists()
    .execute();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  // One row per GMDN term (device type) and supplier, which is what the
  // /device-type/:deviceTypeId/supplier/:supplierId pages are keyed on. Only
  // combinations with at least one named product aggregation are included, as
  // the supplier page lists those and has nothing to show without them.
  //
  // The search_doc is built from the GMDN term name alone, so searches match
  // on device type rather than on product or supplier details.
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
        ])
        .select([
          "g.gmdn_code as gmdn_code",
          "g.gmdn_term_name as gmdn_term_name",
          "m.manufacturer_id as manufacturer_id",
          "m.man_organisation_name as manufacturer_name",
        ])
        .select(
          sql<number>`count(DISTINCT p.aggregation_name)::integer`.as(
            "device_count",
          ),
        )
        .select(
          sql<string>`to_tsvector('english', g.gmdn_term_name)`.as(
            "search_doc",
          ),
        ),
    )
    .execute();

  // Unique index lets the view be refreshed with REFRESH MATERIALIZED VIEW CONCURRENTLY
  await db.schema
    .createIndex("device_type_search_gmdn_code_manufacturer_id")
    .on("external.device_type_search")
    .unique()
    .columns(["gmdn_code", "manufacturer_id"])
    .execute();

  await db.schema
    .createIndex("device_type_search_fts")
    .on("external.device_type_search")
    .using("GIN")
    .column("search_doc")
    .execute();
}

import { Kysely } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("app.product_matches")
    .addColumn("product_id", "integer", (col) =>
      col.references("external.products.product_id").notNull(),
    )
    .addColumn("evidence_id", "integer", (col) =>
      col.references("app.evidence.evidence_id").notNull(),
    )
    .addPrimaryKeyConstraint("app_product_matches_pkey", [
      "evidence_id",
      "product_id",
    ])
    .execute();

  // Link the evidence back to every product in the aggregation
  await db
    .insertInto("app.product_matches")
    .columns(["product_id", "evidence_id"])
    .expression((eb) =>
      eb
        .selectFrom("app.product_evidence as pe")
        .innerJoin(
          "external.products as p",
          "p.aggregation_name",
          "pe.aggregation_name",
        )
        .select(["p.product_id", "pe.evidence_id"]),
    )
    .execute();

  await db.schema.dropTable("app.product_evidence").execute();

  await db
    .withSchema("app")
    .schema.createView("make_documents")
    .as(
      db
        .selectFrom("app.product_matches as m")
        .innerJoin("app.evidence as e", "m.evidence_id", "e.evidence_id")
        .innerJoin("app.documents as d", "m.evidence_id", "d.document_id")
        .innerJoin(
          "app.document_type as t",
          "d.type_of_doc_id",
          "t.type_of_doc_id",
        )
        .innerJoin(
          "app.organisations as o",
          "d.organisation_id",
          "o.organisation_id",
        )
        .innerJoin(
          "app.org_category as c",
          "o.org_category_id",
          "c.org_category_id",
        )
        .innerJoin("app.org_type as b", "o.org_type_id", "b.org_type_id")
        .select("m.product_id")
        .select("d.document_id")
        .select("d.upload_date")
        .select("d.expiry_date")
        .select("e.assessment_date")
        .select("e.rating")
        .select("e.rating_type")
        .select("e.procured")
        .select("e.scale")
        .select("e.ward_department")
        .select("e.summary")
        .select("t.type_of_doc_desc")
        .select("o.organisation_name")
        .select("c.org_category_desc")
        .select("b.org_type_desc")
        .select("d.url_directory"),
    )
    .execute();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  // make_documents depends on product_matches.product_id and is no longer used
  await db.withSchema("app").schema.dropView("make_documents").execute();

  // Evidence is now linked to a product aggregation rather than an individual
  // product. aggregation_name isn't unique in external.products so we can't
  // add a foreign key to it.
  await db.schema
    .createTable("app.product_evidence")
    .addColumn("aggregation_name", "varchar", (col) => col.notNull())
    .addColumn("evidence_id", "integer", (col) =>
      col.references("app.evidence.evidence_id").notNull(),
    )
    .addPrimaryKeyConstraint("app_product_evidence_pkey", [
      "aggregation_name",
      "evidence_id",
    ])
    .execute();

  // Several products in the same aggregation may share evidence, so collapse
  // them down to a single link. Products without an aggregation are dropped.
  await db
    .insertInto("app.product_evidence")
    .columns(["aggregation_name", "evidence_id"])
    .expression((eb) =>
      eb
        .selectFrom("app.product_matches as m")
        .innerJoin("external.products as p", "p.product_id", "m.product_id")
        .select(["p.aggregation_name", "m.evidence_id"])
        .where("p.aggregation_name", "is not", null)
        .distinct(),
    )
    .execute();

  await db.schema.dropTable("app.product_matches").execute();
}

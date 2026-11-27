import { Kysely, sql } from "kysely";

import { up as createEvidenceLink } from "./20261030-01-link-evidence-to-aggregation.js";
import { up as createUsefulEvidence } from "./20261030-01-link-evidence-to-aggregation.js";
import { up as createSupplierEvidence } from "./20261030-01-link-evidence-to-aggregation.js";

import { down as dropEvidenceLink } from "./20261030-01-link-evidence-to-aggregation.js";
import { down as dropUsefulEvidence } from "./20261030-01-link-evidence-to-aggregation.js";
import { down as dropSupplierEvidence } from "./20261030-01-link-evidence-to-aggregation.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("app.product_evidence_useful")
    .addColumn("product_id", "integer")
    .execute();

  await db.schema
    .alterTable("app.product_evidence_useful")
    .dropConstraint("app_product_evidence_useful_pkey")
    .execute();

  // Link each useful mark back to every product in the aggregation
  await sql`
    INSERT INTO app.product_evidence_useful
      (aggregation_id, product_id, evidence_id, user_id, date_marked_useful)
    SELECT u.aggregation_id, p.product_id, u.evidence_id, u.user_id, u.date_marked_useful
    FROM app.product_evidence_useful u
    INNER JOIN external.products p ON p.aggregation_id = u.aggregation_id
    WHERE u.product_id IS NULL
  `.execute(db);

  await db
    .deleteFrom("app.product_evidence_useful")
    .where("product_id", "is", null)
    .execute();

  await db.schema
    .alterTable("app.product_evidence_useful")
    .dropColumn("aggregation_id")
    .execute();

  await db.schema
    .alterTable("app.product_evidence_useful")
    .alterColumn("product_id", (col) => col.setNotNull())
    .execute();

  await db.schema
    .alterTable("app.product_evidence_useful")
    .addForeignKeyConstraint(
      "product_documents_useful_product_id_fkey",
      ["product_id"],
      "external.products",
      ["product_id"],
    )
    .execute();

  await db.schema
    .alterTable("app.product_evidence_useful")
    .addPrimaryKeyConstraint("app_product_evidence_useful_pkey", [
      "product_id",
      "evidence_id",
      "user_id",
    ])
    .execute();

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
          "p.aggregation_id",
          "pe.aggregation_id",
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
  // product.
  await db.schema
    .createTable("app.product_evidence")
    .addColumn("aggregation_id", "integer", (col) => col.notNull())
    .addColumn("evidence_id", "integer", (col) =>
      col.references("app.evidence.evidence_id").notNull(),
    )
    .addPrimaryKeyConstraint("app_product_evidence_pkey", [
      "aggregation_id",
      "evidence_id",
    ])
    .execute();

  // Several products in the same aggregation may share evidence, so collapse
  // them down to a single link. Products without an aggregation are dropped.
  await db
    .insertInto("app.product_evidence")
    .columns(["aggregation_id", "evidence_id"])
    .expression((eb) =>
      eb
        .selectFrom("app.product_matches as m")
        .innerJoin("external.products as p", "p.product_id", "m.product_id")
        .select(["p.aggregation_id", "m.evidence_id"])
        .where("p.aggregation_id", "is not", null)
        .distinct(),
    )
    .execute();

  await db.schema.dropTable("app.product_matches").execute();

  // Useful marks now follow evidence in being linked to a product aggregation
  // rather than an individual product.
  await db.schema
    .alterTable("app.product_evidence_useful")
    .addColumn("aggregation_id", "integer")
    .execute();

  await sql`
    UPDATE app.product_evidence_useful u
    SET aggregation_id = p.aggregation_id
    FROM external.products p
    WHERE p.product_id = u.product_id
  `.execute(db);

  // Products without an aggregation are dropped, and a user who marked the
  // same evidence useful on several products in an aggregation keeps only
  // their earliest mark.
  await db
    .deleteFrom("app.product_evidence_useful")
    .where("aggregation_id", "is", null)
    .execute();

  await sql`
    DELETE FROM app.product_evidence_useful u
    USING app.product_evidence_useful other
    WHERE u.aggregation_id = other.aggregation_id
      AND u.evidence_id = other.evidence_id
      AND u.user_id = other.user_id
      AND (u.date_marked_useful, u.product_id) > (other.date_marked_useful, other.product_id)
  `.execute(db);

  // Dropping product_id also drops its foreign key, the primary key and the
  // old unique index, which all include it
  await db.schema
    .alterTable("app.product_evidence_useful")
    .dropColumn("product_id")
    .execute();

  await db.schema
    .alterTable("app.product_evidence_useful")
    .alterColumn("aggregation_id", (col) => col.setNotNull())
    .execute();

  await db.schema
    .alterTable("app.product_evidence_useful")
    .addPrimaryKeyConstraint("app_product_evidence_useful_pkey", [
      "aggregation_id",
      "evidence_id",
      "user_id",
    ])
    .execute();
}

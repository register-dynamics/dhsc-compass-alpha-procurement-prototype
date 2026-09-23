import { Kysely, sql } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.withSchema("app").schema.dropView("make_documents").execute();

  await db.schema.dropTable("app.evidence").execute();

  await db.schema
    .alterTable("app.documents")
    .dropColumn("evidence_id")
    .addColumn("assessment_date", "varchar")
    .addColumn("assessment_date_desc", "varchar")
    .addColumn("rating", "varchar")
    .addColumn("rating_type", "varchar")
    .addColumn("procured", "boolean")
    .addColumn("scale", "integer")
    .addColumn("ward_department", "varchar")
    .execute();

  await db
    .withSchema("app")
    .schema.createView("make_documents")
    .as(
      db
        .selectFrom("app.product_matches as m")
        .innerJoin("app.documents as d", "m.document_id", "d.document_id")
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
        .select("d.assessment_date")
        .select("d.rating")
        .select("d.rating_type")
        .select("d.procured")
        .select("d.scale")
        .select("d.ward_department")
        .select("d.summary")
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
  await db.schema
    .createTable("app.evidence")
    .addColumn("evidence_id", "serial", (col) => col.primaryKey())
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addColumn("modified_at", "timestamp")
    .addColumn("assessment_date", "varchar")
    .addColumn("assessment_date_desc", "varchar")
    .addColumn("rating", "varchar")
    .addColumn("rating_type", "varchar")
    .addColumn("organisation_id", "integer", (col) =>
      col.references("app.organisations.organisation_id").notNull(),
    )
    .addColumn("procured", "boolean")
    .addColumn("scale", "integer")
    .addColumn("ward_department", "varchar")
    .addColumn("summary", "varchar")
    .execute();

  await db
    .insertInto("app.evidence")
    .columns([
      "evidence_id",
      "created_at",
      "assessment_date",
      "assessment_date_desc",
      "rating",
      "rating_type",
      "organisation_id",
      "procured",
      "scale",
      "ward_department",
      "summary",
    ])
    .expression((eb) =>
      eb
        .selectFrom("app.documents as d")
        .select([
          "d.document_id",
          sql<string>`now()`.as('created_at'),
          "d.assessment_date",
          "d.assessment_date_desc",
          "d.rating",
          "d.rating_type",
          "d.organisation_id",
          "d.procured",
          "d.scale",
          "d.ward_department",
          "d.summary",
        ]),
    )
    .execute();

  await db.withSchema("app").schema.dropView("make_documents").execute();

  // Despite adding organisation_id and summary to app.evidence, we also leave
  // them in app.documents as documents might have their own organisation and
  // summary, I think?
  await db.schema
    .alterTable("app.documents")
    .addColumn("evidence_id", "integer", (col) =>
      col.references("app.evidence.evidence_id"),
    )
    .dropColumn("assessment_date")
    .dropColumn("assessment_date_desc")
    .dropColumn("rating")
    .dropColumn("rating_type")
    .dropColumn("procured")
    .dropColumn("scale")
    .dropColumn("ward_department")
    .execute();

  await db
    .updateTable("app.documents")
    .set({ evidence_id: sql<string>`document_id` })
    .execute();

  await db.schema
    .alterTable("app.documents")
    .alterColumn("evidence_id", (col) => col.setNotNull())
    .execute();

  await db.schema
    .alterTable("app.product_matches")
    .addColumn(
      "evidence_id",
      "integer",
      (col) => col.references("app.evidence.evidence_id"), // .notNull()
    )
    .execute();

  await db
    .updateTable("app.product_matches")
    .set({ evidence_id: sql<string>`document_id` })
    .execute();

  await db.schema
    .alterTable("app.product_matches")
    .dropColumn("document_id")
    .alterColumn("evidence_id", (col) => col.setNotNull())
    .execute();

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

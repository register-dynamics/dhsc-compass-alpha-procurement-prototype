import { Kysely, sql } from "kysely";

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
      (aggregation_name, product_id, evidence_id, user_id, date_marked_useful)
    SELECT u.aggregation_name, p.product_id, u.evidence_id, u.user_id, u.date_marked_useful
    FROM app.product_evidence_useful u
    INNER JOIN external.products p ON p.aggregation_name = u.aggregation_name
    WHERE u.product_id IS NULL
  `.execute(db);

  await db
    .deleteFrom("app.product_evidence_useful")
    .where("product_id", "is", null)
    .execute();

  await db.schema
    .alterTable("app.product_evidence_useful")
    .dropColumn("aggregation_name")
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
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  // Useful marks now follow evidence in being linked to a product aggregation
  // rather than an individual product. As with app.product_evidence,
  // aggregation_name isn't unique in external.products so there's no foreign key.
  await db.schema
    .alterTable("app.product_evidence_useful")
    .addColumn("aggregation_name", "varchar")
    .execute();

  await sql`
    UPDATE app.product_evidence_useful u
    SET aggregation_name = p.aggregation_name
    FROM external.products p
    WHERE p.product_id = u.product_id
  `.execute(db);

  // Products without an aggregation are dropped, and a user who marked the
  // same evidence useful on several products in an aggregation keeps only
  // their earliest mark.
  await db
    .deleteFrom("app.product_evidence_useful")
    .where("aggregation_name", "is", null)
    .execute();

  await sql`
    DELETE FROM app.product_evidence_useful u
    USING app.product_evidence_useful other
    WHERE u.aggregation_name = other.aggregation_name
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
    .alterColumn("aggregation_name", (col) => col.setNotNull())
    .execute();

  await db.schema
    .alterTable("app.product_evidence_useful")
    .addPrimaryKeyConstraint("app_product_evidence_useful_pkey", [
      "aggregation_name",
      "evidence_id",
      "user_id",
    ])
    .execute();
}

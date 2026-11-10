import { Kysely, sql } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  // Evidence linked to several suppliers' aggregations of the same name
  // collapses back to a single link, keeping each user's earliest useful mark
  await sql`
    DELETE FROM app.product_evidence pe
    USING app.product_evidence other
    WHERE pe.aggregation_name = other.aggregation_name
      AND pe.evidence_id = other.evidence_id
      AND pe.manufacturer_id > other.manufacturer_id
  `.execute(db);

  await sql`
    DELETE FROM app.product_evidence_useful u
    USING app.product_evidence_useful other
    WHERE u.aggregation_name = other.aggregation_name
      AND u.evidence_id = other.evidence_id
      AND u.user_id = other.user_id
      AND (u.date_marked_useful, u.manufacturer_id) > (other.date_marked_useful, other.manufacturer_id)
  `.execute(db);

  // Dropping manufacturer_id also drops the primary keys, which include it
  await db.schema
    .alterTable("app.product_evidence")
    .dropColumn("manufacturer_id")
    .execute();

  await db.schema
    .alterTable("app.product_evidence")
    .addPrimaryKeyConstraint("app_product_evidence_pkey", [
      "aggregation_name",
      "evidence_id",
    ])
    .execute();

  await db.schema
    .alterTable("app.product_evidence_useful")
    .dropColumn("manufacturer_id")
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  // Different suppliers can use the same aggregation name for unrelated
  // products, so evidence and useful marks are linked to an aggregation name
  // and manufacturer together.
  //
  // There's no foreign key to external.manufacturers, as with aggregation_name,
  // so that reloading the external data doesn't cascade into app data.
  await linkToSupplier(
    db,
    "product_evidence",
    ["aggregation_name", "evidence_id"],
    ["aggregation_name", "manufacturer_id", "evidence_id"],
  );
  await linkToSupplier(
    db,
    "product_evidence_useful",
    ["aggregation_name", "evidence_id", "user_id", "date_marked_useful"],
    ["aggregation_name", "manufacturer_id", "evidence_id", "user_id"],
  );
}

// It isn't known which supplier existing links were meant for, so each is
// copied to every supplier with an aggregation of that name, which keeps
// what's shown on each product page the same. Links to an aggregation name
// that no product has any more are dropped.
const linkToSupplier = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: Kysely<any>,
  table: string,
  columns: string[],
  primaryKey: string[],
) => {
  await db.schema
    .alterTable(`app.${table}`)
    .dropConstraint(`app_${table}_pkey`)
    .execute();

  await db.schema
    .alterTable(`app.${table}`)
    .addColumn("manufacturer_id", "integer")
    .execute();

  await sql`
    INSERT INTO ${sql.table(`app.${table}`)}
      (${sql.join(columns.map((column) => sql.ref(column)))}, manufacturer_id)
    SELECT
      ${sql.join(columns.map((column) => sql.ref(`l.${column}`)))},
      m.manufacturer_id
    FROM ${sql.table(`app.${table}`)} l
    INNER JOIN (
      SELECT DISTINCT aggregation_name, manufacturer_id
      FROM external.products
      WHERE aggregation_name IS NOT NULL
    ) m ON m.aggregation_name = l.aggregation_name
    WHERE l.manufacturer_id IS NULL
  `.execute(db);

  await db
    .deleteFrom(`app.${table}`)
    .where("manufacturer_id", "is", null)
    .execute();

  await db.schema
    .alterTable(`app.${table}`)
    .alterColumn("manufacturer_id", (col) => col.setNotNull())
    .execute();

  await db.schema
    .alterTable(`app.${table}`)
    .addPrimaryKeyConstraint(`app_${table}_pkey`, primaryKey)
    .execute();
};

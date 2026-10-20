import { Kysely, sql } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("external.gmdn_category")
    .alterColumn("node_id", (ac) =>
      ac.setDataType(sql`varchar USING node_id::varchar`),
    )
    .alterColumn("parent_id", (ac) =>
      ac.setDataType(sql`varchar USING parent_id::varchar`),
    )
    .alterColumn("top_id", (ac) =>
      ac.setDataType(sql`varchar USING top_id::varchar`),
    )
    .execute();

  await db.schema
    .alterTable("external.gmdn_category_term")
    .alterColumn("term_code", (ac) =>
      ac.setDataType(sql`varchar USING term_code::varchar`),
    )
    .execute();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("external.gmdn_category")
    .alterColumn("node_id", (ac) =>
      ac.setDataType(sql`integer USING node_id::integer`),
    )
    .alterColumn("parent_id", (ac) =>
      ac.setDataType(sql`integer USING parent_id::integer`),
    )
    .alterColumn("top_id", (ac) =>
      ac.setDataType(sql`integer USING top_id::integer`),
    )
    .execute();

  await db.schema
    .alterTable("external.gmdn_category_term")
    .alterColumn("term_code", (ac) =>
      ac.setDataType(sql`integer USING term_code::integer`),
    )
    .execute();
}

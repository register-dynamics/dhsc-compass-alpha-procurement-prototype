import { Kysely, sql } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("external.atamis_to_gmdn")
    .alterColumn("nodeID", (ac) => ac.setDataType(sql`varchar USING nodeID::varchar`))
    .execute();
}

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("external.gmdn_category")
    .alterColumn("nodeID", (ac) => ac.setDataType(sql`integer USING nodeID::integer`))
    .execute();
}
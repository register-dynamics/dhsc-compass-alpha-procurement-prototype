import { Kysely, sql } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("external.atamis_contracts")
    .alterColumn("company_regestration_number", (ac) =>
      ac.setDataType(sql`integer USING company_regestration_number::integer`)
    )
    .execute();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("external.atamis_contracts")
    .alterColumn("company_regestration_number", (ac) =>
      ac.setDataType(sql`varchar USING company_regestration_number::varchar`)
    )
    .execute();
}

import { Kysely } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.withSchema("app").schema.dropView("organisation_details").execute();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db
    .withSchema("app")
    .schema.createView("organisation_details")
    .as(
      db
        .selectFrom("app.organisations as o")
        .innerJoin(
          "app.org_category as c",
          "o.org_category_id",
          "c.org_category_id",
        )
        .innerJoin("app.org_type as b", "o.org_type_id", "b.org_type_id")
        .select("o.organisation_id as organisation_id")
        .select("o.organisation_name as organisation_name")
        .select("c.org_category_desc as organisation_category_name")
        .select("b.org_type_desc as organisation_type_name"),
    )
    .execute();
}

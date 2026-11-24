import { Kysely } from "kysely";

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .withSchema("external")
    .alterTable("gmdn_term")
    .renameTo("gmdn")
    .execute();
}

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .withSchema("external")
    .alterTable("gmdn")
    .renameTo("gmdn_term")
    .execute();
}
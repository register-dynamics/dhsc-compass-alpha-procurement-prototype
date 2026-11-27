import { Kysely } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("user_sessions").execute();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  // connect-pg-simple will create this table itself, but in production we're not
  // allowed to create tables from the app - so it has to be pre-created by a
  // migration (which runs from the CI runner so has the permission to create tables).

  // The table may already exist due to previously running the app and
  // connect-pg-simple having made it, so ifNotExists is essential here.

  await db.schema
    .createTable("user_sessions")
    .ifNotExists()
    .addColumn("sid", "varchar", (col) => col.primaryKey())
    .addColumn("sess", "json", (col) => col.notNull())
    .addColumn("expire", "timestamp", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("IDX_session_expire")
    .on("user_sessions")
    .column("expire")
    .execute();
}

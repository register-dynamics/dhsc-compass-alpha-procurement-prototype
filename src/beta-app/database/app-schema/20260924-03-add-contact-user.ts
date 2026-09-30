import { Kysely } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
    await db.schema
        .alterTable("app.contacts")
        .dropColumn("user_id")
        .execute();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .alterTable("app.contacts")
        .addColumn("user_id", "integer", (col) => col.references("app.users.id"))
        .execute();
}

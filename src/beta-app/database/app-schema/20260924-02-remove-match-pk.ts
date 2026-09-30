import { Kysely } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
    await db.schema
        .alterTable("app.product_matches")
        .dropConstraint("app_product_matches_pkey")
        .execute();

    await db.schema
        .alterTable("app.product_matches")
        .addColumn("match_id", "integer", (col) => col.primaryKey())
        .execute();

    await db.schema
        .alterTable("app.product_matches")
        .addPrimaryKeyConstraint("product_matches_pkey", ["evidence_id", "product_id"])
        .execute();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .alterTable("app.product_matches")
        .dropConstraint("product_matches_pkey")
        .execute();
    
    await db.schema
        .alterTable("app.product_matches")
        .dropColumn("match_id")
        .execute();
    
    await db.schema
        .alterTable("app.product_matches")
        .addPrimaryKeyConstraint("app_product_matches_pkey", ["evidence_id", "product_id"])
        .execute();
}

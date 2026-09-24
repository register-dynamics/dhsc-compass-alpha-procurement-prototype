import { Kysely } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
    await db.schema
        .alterTable("app.evidence_contacts")
        .dropConstraint("app_evidence_contacts_pkey")
        .execute();

    await db.schema
        .alterTable("app.organisation_contact")
        .dropConstraint("app_organisation_contact_pkey")
        .execute();

    await db.schema
        .alterTable("app.organisation_user")
        .dropConstraint("app_organisation_user_pkey")
        .execute();

    await db.schema
        .alterTable("app.product_evidence_useful")
        .dropConstraint("app_product_evidence_useful_pkey")
        .execute();  
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .alterTable("app.evidence_contacts")
        .addPrimaryKeyConstraint("app_evidence_contacts_pkey", ["evidence_id", "contact_id"])
        .execute();

    await db.schema
        .alterTable("app.organisation_contact")
        .addPrimaryKeyConstraint("app_organisation_contact_pkey", ["organisation_id", "contact_id"])
        .execute();

    await db.schema
        .alterTable("app.organisation_user")
        .addPrimaryKeyConstraint("app_organisation_user_pkey", ["organisation_id", "user_id"])
        .execute();

    await db.schema
        .alterTable("app.product_evidence_useful")
        .addPrimaryKeyConstraint("app_product_evidence_useful_pkey", ["product_id", "evidence_id", "user_id"])
        .execute();
}

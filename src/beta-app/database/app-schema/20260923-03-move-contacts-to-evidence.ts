import { Kysely } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("app.evidence_contacts")
    .renameTo("document_contacts")
    .execute();

  await db.schema
    .alterTable("app.document_contacts")
    .dropConstraint("evidence_contacts_evidence_id_fkey")
    .execute();

  await db.schema
    .alterTable("app.document_contacts")
    .renameColumn("evidence_id", "document_id")
    .execute();

  await db.schema
    .alterTable("app.document_contacts")
    .addForeignKeyConstraint(
      "document_contacts_document_id_fkey",
      ["document_id"],
      "app.documents",
      ["document_id"],
    )
    .execute();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("app.document_contacts")
    .dropConstraint("document_contacts_document_id_fkey")
    .execute();

  await db.schema
    .alterTable("app.document_contacts")
    .renameColumn("document_id", "evidence_id")
    .execute();

  await db.schema
    .alterTable("app.document_contacts")
    .addForeignKeyConstraint(
      "evidence_contacts_evidence_id_fkey",
      ["evidence_id"],
      "app.evidence",
      ["evidence_id"],
    )
    .execute();

  await db.schema
    .alterTable("app.document_contacts")
    .renameTo("evidence_contacts")
    .execute();
}

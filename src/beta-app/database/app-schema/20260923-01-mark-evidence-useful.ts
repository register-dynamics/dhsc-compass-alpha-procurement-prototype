import { Kysely } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("app.product_evidence_useful")
    .renameTo("product_documents_useful")
    .execute();

  await db.schema
    .alterTable("app.product_documents_useful")
    .dropConstraint("product_documents_useful_evidence_id_fkey")
    .execute();

  await db.schema
    .alterTable("app.product_documents_useful")
    .renameColumn("evidence_id", "document_id")
    .execute();

  await db.schema
    .alterTable("app.product_documents_useful")
    .addForeignKeyConstraint(
      "product_evidence_useful_document_id_fkey",
      ["document_id"],
      "app.documents",
      ["document_id"],
    )
    .execute();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("app.product_documents_useful")
    .dropConstraint("product_documents_useful_document_id_fkey")
    .execute();

  await db.schema
    .alterTable("app.product_documents_useful")
    .renameColumn("document_id", "evidence_id")
    .execute();

  await db.schema
    .alterTable("app.product_documents_useful")
    .addForeignKeyConstraint(
      "product_evidence_useful_evidence_id_fkey",
      ["evidence_id"],
      "app.evidence",
      ["evidence_id"],
    )
    .execute();

  await db.schema
    .alterTable("app.product_documents_useful")
    .renameTo("product_evidence_useful")
    .execute();
}

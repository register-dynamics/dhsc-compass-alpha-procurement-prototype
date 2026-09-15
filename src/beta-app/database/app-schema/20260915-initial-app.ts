import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('app.document_type')
    .addColumn('type_of_doc_id', 'integer', (col) => col.primaryKey())
    .addColumn('type_of_doc_desc', 'varchar', (col) => col.notNull())
    .execute()

  await db.schema
    .createTable('app.org_type')
    .addColumn('org_type_id','integer', (col) => col.primaryKey())
    .addColumn('org_type_desc', 'varchar', (col) => col.notNull())
    .execute()

  await db.schema
    .createTable('app.org_category')
    .addColumn('org_category_id','integer', (col) => col.primaryKey())
    .addColumn('org_category_desc', 'varchar', (col) => col.notNull())
    .execute()

  await db.schema
    .createTable('app.contacts')
    .addColumn('contact_id','integer', (col) => col.primaryKey())
    .addColumn('title','varchar', (col) => col.notNull())
    .addColumn('given_name','varchar', (col) => col.notNull())
    .addColumn('surname','varchar', (col) => col.notNull())
    .addColumn('email','varchar', (col) => col.notNull())
    .addColumn('phone_no','varchar', (col) => col.notNull())
    .addColumn('role','varchar', (col) => col.notNull())
    .execute()

  await db.schema
    .createTable('app.organisations')
    .addColumn('organisation_id','integer', (col) => col.primaryKey())
    .addColumn('organisation_name','varchar', (col) => col.notNull())
    .addColumn('org_type_id', 'integer', (col) => col.references('app.org_type.org_type_id').notNull())
    .addColumn('org_category_id', 'integer', (col) => col.references('app.org_category.org_category_id').notNull())
    .execute()

  await db.schema
    .createTable('app.documents')
    .addColumn('document_id','serial', (col) => col.primaryKey())
    .addColumn('upload_date','timestamp', (col) => col.notNull())
    .addColumn('expiry_date','timestamp')
    .addColumn('assessment_date','varchar')
    .addColumn('assessment_date_desc','varchar')
    .addColumn('revision_date','timestamp')
    .addColumn('rating','varchar')
    .addColumn('rating_type','varchar')
    .addColumn('type_of_doc_id','integer', (col) => col.references('app.document_type.type_of_doc_id').notNull())
    .addColumn('organisation_id','integer', (col) => col.references('app.organisations.organisation_id').notNull())
    .addColumn('procured','integer', (col) => col.notNull())
    .addColumn('scale','integer')
    .addColumn('ward_department','varchar')
    .addColumn('summary','varchar')
    .addColumn('is_update','boolean', (col) => col.notNull())
    .addColumn('parent_id','integer', (col) => col.references('app.documents.document_id'))
    .addColumn('url_directory','varchar')
    .execute()

  await db.schema
    .createTable('app.document_contacts')
    .addColumn('document_id','integer', (col) => col.references('app.documents.document_id').notNull())
    .addColumn('contact_id','integer', (col) => col.references('app.contacts.contact_id').notNull())
    .addColumn('discuss_implementation','boolean', (col) => col.notNull())
    .addColumn('discuss_training','boolean', (col) => col.notNull())
    .addColumn('discuss_outcomes','boolean', (col) => col.notNull())
    .addColumn('discuss_pharmacy_integration','boolean', (col) => col.notNull())
    .addColumn('discuss_business_case','boolean', (col) => col.notNull())
    .addColumn('discuss_real_world_use','boolean', (col) => col.notNull())
    .addColumn('discuss_EHR_integration','boolean', (col) => col.notNull())
    .execute()

  await db.schema
    .createIndex('document_contacts_pk')
    .on('app.document_contacts')
    .column('document_id')
    .column('contact_id')
    .unique()
    .execute()

  await db.schema
    .createTable('app.product_matches')
    .addColumn('match_id', 'integer', (col) => col.primaryKey())
    .addColumn('product_id', 'integer', (col) => col.references('external.products.product_id').notNull())
    .addColumn('document_id', 'integer', (col) => col.references('app.documents.document_id').notNull())
    .execute()

  await db.schema
    .createTable('app.users')
    .addColumn('id','serial', (col) => col.primaryKey())
    .addColumn('username','varchar', (col) => col.unique())
    .addColumn('password_hash','varchar')
    .addColumn('oidc_subject','varchar', (col) => col.unique())
    .addColumn('given_name','varchar', (col) => col.notNull())
    .addColumn('last_name','varchar', (col) => col.notNull())
    .addColumn('created_at','timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn('modified_at','timestamp')
    .execute()

  await db.schema
    .createTable('app.product_documents_useful')
    .addColumn('product_id','integer', (col) => col.references('external.products.product_id').notNull())
    .addColumn('document_id','integer', (col) => col.references('app.documents.document_id').notNull())
    .addColumn('user_id','integer', (col) => col.references('app.users.id').notNull())
    .addColumn('date_marked_useful','timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .execute()

  await db.schema
    .createIndex('product_documents_useful_pk')
    .on('app.product_documents_useful')
    .column('product_id')
    .column('document_id')
    .column('user_id')
    .unique()
    .execute()

  // Unlike createTable, createView doesn't work nicely if you give it a name with a schema in like app.make_documents (you get a view in the public schema called "app.make_documents"
  await db.withSchema('app').schema
    .createView('make_documents')
    .as(
      db.selectFrom('app.product_matches as m')
        .innerJoin('app.documents as d','m.document_id','d.document_id')
        .innerJoin('app.document_type as t','d.type_of_doc_id','t.type_of_doc_id')
        .innerJoin('app.organisations as o','d.organisation_id','o.organisation_id')
        .innerJoin('app.org_category as c','o.org_category_id','c.org_category_id')
        .innerJoin('app.org_type as b','o.org_type_id','b.org_type_id')
        .select('m.product_id')
        .select('d.document_id')
        .select('d.upload_date')
        .select('d.expiry_date')
        .select('d.assessment_date')
        .select('d.rating')
        .select('d.rating_type')
        .select('d.procured')
        .select('d.scale')
        .select('d.ward_department')
        .select('d.summary')
        .select('t.type_of_doc_desc')
        .select('o.organisation_name')
        .select('c.org_category_desc')
        .select('b.org_type_desc')
        .select('d.url_directory')
    )
    .execute()
}

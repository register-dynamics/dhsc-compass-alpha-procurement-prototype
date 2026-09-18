import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  // TODO: See if I've declared things NOT NULL that might be NULL, when we try to load the data
  // TODO: FK relationships please!

  await db.schema
    .createTable('external.gmdn')
    .addColumn('gmdn_code','integer', (col) => col.primaryKey())
    .addColumn('gmdn_term_name','varchar', (col) => col.notNull())
    .execute()

  await db.schema
    .createTable('external.manufacturers')
    .addColumn('manufacturer_id','integer', (col) => col.primaryKey())
    .addColumn('man_organisation_name', 'varchar', (col) => col.notNull())
    .addColumn('man_country', 'varchar', (col) => col.notNull())
    .addColumn('man_organisation_type', 'varchar', (col) => col.notNull())
    .execute()

  await db.schema
    .createTable('external.device_type')
    .addColumn('device_id', 'integer', (col) => col.primaryKey())
    .addColumn('gmdn_code', 'integer', (col) => col.references('external.gmdn.gmdn_code').notNull())
    .addColumn('device_risk_sub_type', 'varchar', (col) => col.notNull())
    .addColumn('device_type_code', 'varchar', (col) => col.notNull())
    .addColumn('device_type_name', 'varchar', (col) => col.notNull())
    .addColumn('manufacturer_id', 'integer', (col) => col.references('external.manufacturers.manufacturer_id').notNull())
    .execute()

  await db.schema
    .createTable('external.products')
    .addColumn('product_id', 'integer', (col) => col.primaryKey())
    .addColumn('udi_number', 'bigint', (col) => col.notNull())
    .addColumn('device_id', 'integer', (col) => col.references('external.device_type.device_id').notNull())
    .addColumn('is_model', 'integer', (col) => col.notNull()) // Is this really a boolean?
    .addColumn('brand_trade_name', 'varchar', (col) => col.notNull())
    .addColumn('model', 'varchar', (col) => col.notNull())
    .addColumn('product_code', 'varchar', (col) => col.notNull())
    .addColumn('manufacturer_id', 'integer', (col) => col.references('external.manufacturers.manufacturer_id').notNull())
    .execute()

    // Unlike createTable, createView doesn't work nicely if you give it a name with a schema in like app.make_documents (you get a view in the public schema called "app.make_documents"
  await db.withSchema('external').schema
    .createView('search')
    .materialized()
    .as(
      db.selectFrom('external.products as p')
        .leftJoin('external.device_type as t', 'p.device_id', 't.device_id')
        .leftJoin('external.manufacturers as m', 'p.manufacturer_id', 'm.manufacturer_id')
        .innerJoin('external.gmdn as g','t.gmdn_code','g.gmdn_code')
        .select('p.product_id as product_id')
        .select('t.device_id as device_id')
        .select('p.brand_trade_name as product_name')
        .select('p.model as model')
        .select('g.gmdn_term_name as gmdn_name')
        .select('t.device_type_name as type')
        .select('p.product_code as product_code')
        .select('m.man_organisation_name as manufacturer')
        .select('m.man_country as country')
        .select('p.udi_number as udi')
        .select('t.gmdn_code as gmdn_code')
        // Join all the things we'd like free text searches to match on
        .select(sql`to_tsvector('english',
        p.product_id || ' ' ||
        t.device_id || ' ' ||
        p.brand_trade_name || ' ' ||
        p.model || ' ' ||
        g.gmdn_term_name || ' ' ||
        t.device_type_name || ' ' ||
        m.man_organisation_name || ' ' ||
        m.man_country || ' ' ||
        p.udi_number || ' ' ||
        t.gmdn_code) as search_doc`)
    )
    .execute()

  await db.schema
    .createIndex('search_fts')
    .on('external.search')
    .using('GIN')
    .column('search_doc')
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('external.products').execute()
  await db.schema.dropTable('external.manufacturers').execute()
  await db.schema.dropTable('external.gmdn').execute()
  await db.schema.dropTable('external.device_type').execute()
}

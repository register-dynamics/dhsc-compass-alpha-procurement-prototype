CREATE TABLE IF NOT EXISTS "manufacturers" (
	"manufacturer_id"	INTEGER,
	"man_organisation_name"	TEXT,
	"man_country"	TEXT,
	"rep_name"	TEXT,
	PRIMARY KEY("manufacturer_id")
);
CREATE TABLE IF NOT EXISTS "document_type" (
	"type_of_doc_id"	INTEGER,
	"type_of_doc_desc"	TEXT,
	PRIMARY KEY("type_of_doc_id")
);
CREATE TABLE IF NOT EXISTS "organisation" (
	"organisation_id"	INTEGER,
	"organisation_name"	INTEGER,
	PRIMARY KEY("organisation_id")
);
CREATE TABLE IF NOT EXISTS "org_type" (
	"org_type_id"	INTEGER,
	"org_type_desc"	TEXT,
	PRIMARY KEY("org_type_id")
);
CREATE TABLE IF NOT EXISTS "org_category" (
	"org_category_id"	INTEGER,
	"org_category_desc"	TEXT,
	PRIMARY KEY("org_category_id")
);
CREATE TABLE IF NOT EXISTS "matches_model" (
	"model_match_id"	INTEGER,
	"model_id"	INTEGER,
	"document_id"	INTEGER,
	PRIMARY KEY("model_match_id"),
	FOREIGN KEY("model_id") REFERENCES "device_model"("model_id"),
	FOREIGN KEY("document_id") REFERENCES "documents"("document_id")
);
CREATE TABLE IF NOT EXISTS "device_model" (
	"model_id"	INTEGER,
	"manufacturer_id"	INTEGER,
	"model"	TEXT,
	"device_id"	INTEGER,
	PRIMARY KEY("model_id")
);
CREATE TABLE IF NOT EXISTS "device_type" (
	"DEVICE_ID"	INTEGER,
	"GMDN_CODE"	INTEGER,
	"GMDN_TERM_NAME"	TEXT,
	"DEVICE_RISK_SUB_TYPE_CODE"	TEXT,
	"DEVICE_RISK_SUB_TYPE_DESC"	TEXT,
	"DEVICE_TYPE_CODE"	TEXT,
	"DEVICE_TYPE_NAME"	TEXT,
	PRIMARY KEY("DEVICE_ID")
);
CREATE TABLE IF NOT EXISTS "matches_make" (
	"make_match_id"	INTEGER,
	"make_id"	INTEGER,
	"document_id"	INTEGER,
	PRIMARY KEY("make_match_id")
);
CREATE TABLE IF NOT EXISTS "device_make" (
	"make_id"	INTEGER,
	"udi_number"	INTEGER,
	"model_id"	INTEGER,
	"is_model"	INTEGER,
	"brand_trade_name"	TEXT,
	"product_code"	TEXT,
	PRIMARY KEY("make_id")
);
CREATE VIRTUAL TABLE search USING fts5(MAKE_ID, MODEL_ID, DEVICE_ID, MAKE, MODEL, GMDN_NAME, TYPE, PRODUCT_CODE, MANUFACTURER, COUNTRY, UDI, GMDN_CODE)
/* search(MAKE_ID,MODEL_ID,DEVICE_ID,MAKE,MODEL,GMDN_NAME,TYPE,PRODUCT_CODE,MANUFACTURER,COUNTRY,UDI,GMDN_CODE) */;
CREATE TABLE IF NOT EXISTS 'search_data'(id INTEGER PRIMARY KEY, block BLOB);
CREATE TABLE IF NOT EXISTS 'search_idx'(segid, term, pgno, PRIMARY KEY(segid, term)) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS 'search_content'(id INTEGER PRIMARY KEY, c0, c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11);
CREATE TABLE IF NOT EXISTS 'search_docsize'(id INTEGER PRIMARY KEY, sz BLOB);
CREATE TABLE IF NOT EXISTS 'search_config'(k PRIMARY KEY, v) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS "documents" (
	"document_id"	INTEGER,
	"upload_date"	TEXT,
	"expiry_date"	TEXT,
	"assessment_date"	BLOB,
	"assessment_date_desc"	TEXT,
	"revision_date"	TEXT,
	"rating" TEXT,
	"rating_type" TEXT,
	"type_of_doc_id"	INTEGER,
	"organisation_id"	INTEGER,
	"org_type_id"	INTEGER,
	"org_category_id"	INTEGER,
	"procured" INTEGER,
	"scale" INTEGER,
	"ward_department" TEXT,
	"summary"	TEXT,
	"is_update"	NUMERIC,
	"parent_id"	INTEGER,
	"url_directory" TEXT,
	PRIMARY KEY("document_id"),
	FOREIGN KEY("parent_id") REFERENCES "documents"("document_id"),
	FOREIGN KEY("organisation_id") REFERENCES "organisation"("organisation_id"),
	FOREIGN KEY("type_of_doc_id") REFERENCES "document_type"("type_of_doc_id"),
	FOREIGN KEY("org_type_id") REFERENCES "org_type"("org_type_id"),
	FOREIGN KEY("org_category_id") REFERENCES "org_category"("org_category_id")
);
CREATE VIEW "make_documents" AS select m.make_id, d.document_id, d.upload_date, d.expiry_date, d.assessment_date, d.rating, d.rating_type, d.procured, d.scale, d.ward_department, d.summary, t.type_of_doc_desc, o.organisation_name, c.org_category_desc, b.org_type_desc, d.url_directory
from matches_make as m
join documents as d on m.document_id = d.document_id
join document_type as t on d.type_of_doc_id = t.type_of_doc_id
join organisation as o on d.organisation_id = o.organisation_id
join org_category as c on d.org_category_id = c.org_category_id
join org_type as b on d.org_type_id = b.org_type_id
/* make_documents(make_id,document_id,upload_date,expiry_date,assessment_date,rating,rating_type,procured,scale,ward_department,summary,type_of_doc_desc,organisation_name,org_category_desc,org_type_desc,url_directory) */;

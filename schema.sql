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
CREATE TABLE IF NOT EXISTS `contacts` (
  `contact_id` integer NOT NULL PRIMARY KEY AUTOINCREMENT,
  `title` varchar(32) NULL,
  `given_name` varchar(255) NOT NULL,
  `surname` varchar(255) NOT NULL,
  `email` varchar(255) NULL,
  `phone_no` varchar(32) NULL,
  `role` varchar(256) NOT NULL,
  UNIQUE (`contact_id`)
);
CREATE TABLE IF NOT EXISTS `document_contacts` (
  `document_id` INT NOT NULL,
  `contact_id` INT NOT NULL,
  `discuss_implementation` BOOLEAN NOT NULL DEFAULT 0,
  `discuss_training` BOOLEAN NOT NULL DEFAULT 0,
  `discuss_outcomes` BOOLEAN NOT NULL DEFAULT 0,
  `discuss_pharmacy_integration` BOOLEAN NOT NULL DEFAULT 0,
  `discuss_business_case` BOOLEAN NOT NULL DEFAULT 0,
  `discuss_real_world_use` BOOLEAN NOT NULL DEFAULT 0,
  `discuss_EHR_integration` BOOLEAN NOT NULL DEFAULT 0,
  PRIMARY KEY (`document_id`, `contact_id`)
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

-- Lookup tables first (referenced by documents via foreign keys)
INSERT INTO document_type (type_of_doc_id, type_of_doc_desc) VALUES
	(1, 'ODEP assessment'),
	(2, 'NJR report'),
	(3, 'Business case'),
	(4, 'Clinical trial funded by supplier'),
	(5, 'Clinical trial uploaded by supplier'),
	(6, 'Clinical trial with supplier response'),
	(7, 'Evaluation');


INSERT INTO organisation (organisation_id, organisation_name) VALUES
 	(1, 'ODEP'),
	(2, 'NJR'),
	(3, 'Barts Health NHS Trust'),
	(4, 'Portsmouth Hospitals University NHS Trus'),
	(5, 'Guys & St Thomas'' NHS Foundation Trust'),
	(6, 'University Hospitals Birmingham NHS Foundation Trust'),
	(7, 'Northumbria Healthcare NHS Foundation Trust');


INSERT INTO org_type (org_type_id, org_type_desc) VALUES
  (1, 'Independent Assessment Body'),
  (2, 'NHS Trust');

INSERT INTO org_category (org_category_id, org_category_desc) VALUES
  (1, 'Trusted');

-- Documents — type_of_doc_id/organisation_id/org_type_id/org_category_id resolve via lookup tables above
INSERT INTO documents (document_id, upload_date, expiry_date, assessment_date, rating, rating_type, type_of_doc_id, organisation_id, org_type_id, org_category_id, procured, scale, ward_department, summary, url_directory) VALUES
  (1234, 'May-26',  '21/11/2026', '21/11/2025',  NULL, NULL, 2, 2, 1, 1, NULL, NULL, NULL,                                              'NJR report',        'pms_report_hp_stem_corin_proxima_all_26_11_25.pdf'),
  (4567, 'Jul-26',  NULL,         '2019-2021',   NULL, NULL, 4, 4, 2, 1, 1,    484,  'Gastroenterology Unit, Queen Alexandra Hospital',  'Trust clinical trial', 'Portsmouth Hospitals University NHS Trust clinical trial FAKE.pdf'),
  (7891, 'Jul-26',  NULL,         'Jan24-Jun24', NULL, NULL, 6, 7, 2, 1, 0,    NULL, 'Ward 3, Northumbria Specialist Emergency Care',    'Trust clinical trial', 'Northumbria Healthcare NHS Foundation Trust clinical trial FAKE.pdf'),
  (8912, 'Jul-26',  NULL,         'Feb23-May24', NULL, NULL, 5, 5, 2, 1, 1,    50,   'Urology department, Guy''s Hospital',              'Trust clinical trial', 'Guys St Thomas NHS trist clinical trial FAKE.pdf'),
  (9123, 'Jul-26',  NULL,         'Jan-23',      NULL, NULL, 3, 3, 2, 1, 1,    NULL, 'Dialysis Unit, St Bartholomew''s Hospital',        'Trust business case',  'Barts Health NHS Trust business case FAKE.pdf'),
  (13456,'Jul-26',  NULL,         'Mar23-Aug23', NULL, NULL, 7, 6, 2, 1, 1,    NULL, 'Oncology Day Unit, Queen Elizabeth Hospital',      'Trust evaluation',     'University Hospitals Birmingham NHS Foundation Trust evaluation FAKE.pdf');

-- All documents linked to make_id 4477153
INSERT INTO matches_make (make_match_id, make_id, document_id) VALUES
  -- Proxima HA Stem Standard (make_id 4477153)
  (1, 4477153, 1234),
  (2, 4477153, 4567),
  (3, 4477153, 7891),
  (4, 4477153, 8912),
  (5, 4477153, 9123),
  (6,  4477153, 13456),
  -- Air mattress (make_id 1122001)
  (7,  1122001, 4567),
  (8,  1122001, 9123),
  -- HydroHeal Plus (make_id 1122002)
  (9,  1122002, 7891),
  (10, 1122002, 8912),
  -- Insulin pump (make_id 1122003)
  (11, 1122003, 1234),
  (12, 1122003, 13456),
  -- Surgical mesh (make_id 1122004)
  (13, 1122004, 8912),
  (14, 1122004, 9123),
  -- Continuous glucose monitor (make_id 1122005)
  (15, 1122005, 1234),
  (16, 1122005, 4567),
  (17, 1122005, 7891);

-- MAKE_ID 4477153 matches the make_id used in matches_make above
INSERT INTO search (MAKE_ID, MODEL_ID, DEVICE_ID, MAKE, MODEL, GMDN_NAME, TYPE, PRODUCT_CODE, MANUFACTURER, COUNTRY, UDI, GMDN_CODE) VALUES
  ('4477153', '8801', '5501', 'Proxima HA', 'Proxima HA Stem Standard',      'Hip Joint Prosthesis, Femoral Stem Component', 'Non-active Implantable', 'PROX-HA-STD', 'Corin Group Ltd', 'United Kingdom', '05012345600001', '47011'),
  ('4477153', '8802', '5501', 'Proxima HA', 'Proxima HA Stem Lateral Flare', 'Hip Joint Prosthesis, Femoral Stem Component', 'Non-active Implantable', 'PROX-HA-LF',  'Corin Group Ltd', 'United Kingdom', '05012345600002', '47011'),
  ('1122001', '8810', '5510', 'AlphaPlex',    'AlphaPlex 4000 Static',         'Powered Air Flotation Mattress',              'Non-active',             'AP4000-S',   'ArjoHuntleigh UK Ltd',   'United Kingdom', '05012345600010', '35946'),
  ('1122001', '8811', '5510', 'AlphaPlex',    'AlphaPlex 4000 Dynamic',        'Powered Air Flotation Mattress',              'Non-active',             'AP4000-D',   'ArjoHuntleigh UK Ltd',   'United Kingdom', '05012345600011', '35946'),
  ('1122002', '8820', '5520', 'HydroHeal',    'HydroHeal Plus 10cm',           'Wound Dressing, Hydrocolloid',                'Non-active',             'HH-PLUS-10', 'Dermal Sciences Ltd',    'United Kingdom', '05012345600020', '38565'),
  ('1122002', '8821', '5520', 'HydroHeal',    'HydroHeal Plus 20cm',           'Wound Dressing, Hydrocolloid',                'Non-active',             'HH-PLUS-20', 'Dermal Sciences Ltd',    'United Kingdom', '05012345600021', '38565'),
  ('1122003', '8830', '5530', 'InsuFlow Pro', 'InsuFlow Pro 300 Pump System',  'Insulin Infusion Pump',                       'Active Non-implantable',  'IF-PRO-300', 'BetaCare Medical Ltd',   'Germany',        '04123456780030', '13714'),
  ('1122003', '8831', '5530', 'InsuFlow Pro', 'InsuFlow Pro 300 Reservoir Kit','Insulin Infusion Pump',                       'Active Non-implantable',  'IF-PRO-RK',  'BetaCare Medical Ltd',   'Germany',        '04123456780031', '13714'),
  ('1122004', '8840', '5540', 'SurgiWeave',   'SurgiWeave Light Hernia Mesh',  'Surgical Mesh, Hernia Repair',                'Non-active Implantable',  'SW-HM-LT',   'SurgiTech Solutions Ltd','United Kingdom', '05012345600040', '47701'),
  ('1122004', '8841', '5540', 'SurgiWeave',   'SurgiWeave Heavy Hernia Mesh',  'Surgical Mesh, Hernia Repair',                'Non-active Implantable',  'SW-HM-HV',   'SurgiTech Solutions Ltd','United Kingdom', '05012345600041', '47701'),
  ('1122005', '8850', '5550', 'GlucoSense',   'GlucoSense Flex 14-Day Sensor', 'Continuous Glucose Monitor',                  'Active Non-implantable',  'GS-FLEX-14', 'BioSense Medical Ltd',   'Ireland',        '05391234560050', '47783'),
  ('1122005', '8851', '5550', 'GlucoSense',   'GlucoSense Flex Reader',        'Continuous Glucose Monitor',                  'Active Non-implantable',  'GS-FLEX-RD', 'BioSense Medical Ltd',   'Ireland',        '05391234560051', '47783');


-- Contacts for documents
INSERT INTO contacts (contact_id, given_name, surname, email, phone_no, role) VALUES
  	(1, 'Jeana', 'Somerfield', 'jsomerfield0@nhs.net', '1373644493', 'Staff Scientist, Clinical Research'),
	(2, 'Jessika', 'Boulton', 'jboulton1@nhs.net', '7341050616', 'Doctor, Emergency Medicine'),
	(3, 'Andris', 'Naldrett', null, '0123456789', 'Statistician, Clinical Trials'),
	(4, 'Alena', 'Colomb', 'acolomb3@nhs.net', null, 'Nurse, Ward 3'),
	(5, 'Emogene', 'Roblett', 'eroblett4@nhs.net', null, 'Design manager, Clinical Trials'),
	(6, 'Sara', 'Sparling', 'ssparling5@nhs.net', null, 'Speech Pathologist, Therapy Services'),
	(7, 'Hortensia', 'Sinnott', null, '9133181656', 'Senior Clinician, Clinical Trials'),
	(8, 'Louisette', 'Vanns', null, '5606190909', 'Medical Informatics Specialist, Statistics'),
	(9, 'Mahalia', 'Immings', null, '6431047410', 'Software Engineer I, Software Development'),
	(10, 'Jackelyn', 'Gricewood', 'jgricewood9@nhs.net', null, 'Implant Specialist, Orthopaedic Surgery');

  
-- Link contacts to documents via document_contacts table
INSERT INTO document_contacts (document_id, contact_id, discuss_implementation, discuss_training, discuss_outcomes, discuss_pharmacy_integration, discuss_business_case, discuss_real_world_use, discuss_EHR_integration) VALUES
  (1234, 1, 1, 0, 0, 0, 0, 0, 0),
  (1234, 2, 1, 1, 0, 0, 0, 0, 0),
  (4567, 3, 0, 1, 1, 0, 0, 0, 0),
  (4567, 4, 0, 0, 1, 1, 0, 0, 0),
  (7891, 5, 0, 0, 0, 1, 1, 0, 0),
  (7891, 6, 0, 0, 0, 0, 1, 1, 0),
  (8912, 7, 1, 1, 1, 1, 1, 1, 1),
  (8912, 8, 1, 0, 0, 0, 0, 0, 0),
  (9123, 9, 0, 1, 0, 1, 0, 1, 0),
  (13456, 10, 1, 1, 1, 1, 1, 1, 1);

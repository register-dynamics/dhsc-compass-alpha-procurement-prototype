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
CREATE TABLE IF NOT EXISTS "documents" (
	"document_id"	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
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
	FOREIGN KEY("parent_id") REFERENCES "documents"("document_id"),
	FOREIGN KEY("organisation_id") REFERENCES "organisation"("organisation_id"),
	FOREIGN KEY("type_of_doc_id") REFERENCES "document_type"("type_of_doc_id"),
	FOREIGN KEY("org_type_id") REFERENCES "org_type"("org_type_id"),
	FOREIGN KEY("org_category_id") REFERENCES "org_category"("org_category_id")
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


CREATE VIEW "make_documents" AS select m.make_id, d.document_id, d.upload_date, d.expiry_date, d.assessment_date, d.rating, d.rating_type, d.procured, d.scale, d.ward_department, d.summary, t.type_of_doc_desc, o.organisation_name, c.org_category_desc, b.org_type_desc, d.url_directory
from matches_make as m
join documents as d on m.document_id = d.document_id
join document_type as t on d.type_of_doc_id = t.type_of_doc_id
join organisation as o on d.organisation_id = o.organisation_id
join org_category as c on d.org_category_id = c.org_category_id
join org_type as b on d.org_type_id = b.org_type_id
/* make_documents(make_id,document_id,upload_date,expiry_date,assessment_date,rating,rating_type,procured,scale,ward_department,summary,type_of_doc_desc,organisation_name,org_category_desc,org_type_desc,url_directory) */;

-- Insert dummy product & manufacturer data into relevant tables
INSERT INTO "manufacturers" ("manufacturer_id","man_organisation_name","man_country","rep_name") VALUES (13455,'Aorta Solutions','Scotland, United Kingdom',NULL),
 (33625,'Chumley Technologies','England, United Kingdom',NULL),
 (44622,'Beta Healthcare Solutions','England, United Kingdom',NULL),
 (45123,'Ferrus Technology Solutions','Scotland, United Kingdom',NULL),
 (45273,'Epsilon tech Ltd','Northern Ireland, United Kingdom',NULL),
 (46285,'Upper Norfolk Implant Technologies','United States','UNIT UK'),
 (55623,'Saccharine & Sons','England, United Kingdom',NULL),
 (65283,'OmegaAM Solutions','Netherlands','ThetaSigma Ltd'),
 (73156,'Aquatech Ltd','Wales, United Kingdom',NULL),
 (78546,'Seinar Systems Ltd','Austria','Seinar Systems UK'),
 (91326,'Praxis & Co','England, United Kingdom',NULL),
 (95632,'ArcTech Ltd','England, United Kingdom',NULL);
INSERT INTO "device_model" ("model_id","manufacturer_id","model","device_id") VALUES (12365,65283,'Thermometer tympanic device',5362),
 (12684,46285,'UNIT Artifical Hip',4623),
 (15296,13455,'Heart Pro',6542),
 (35746,78546,'Opthalmic',7895),
 (45621,45123,'Blood Pressure Kit',4567),
 (46285,91326,'Praxis Total Knee',1896),
 (65432,44622,'BetaPlex 4000',1258),
 (75314,13455,'Pacemaker',6523),
 (78965,95632,'InsuFlow Pro',4258),
 (79315,45273,'Eye Shield',4455),
 (85214,33625,'Insulin Kit',6324),
 (85215,55623,'GlucoSense',1596),
 (95146,13455,'Heart Rate Monitor',4523),
 (96325,73156,'HydroHeal Plus',4623);
INSERT INTO "device_type" ("DEVICE_ID","GMDN_CODE","GMDN_TERM_NAME","DEVICE_RISK_SUB_TYPE_CODE","DEVICE_RISK_SUB_TYPE_DESC","DEVICE_TYPE_CODE","DEVICE_TYPE_NAME") VALUES (1258,35643,'Cochlear implant system','NULL','NULL','AID','Active Implantable Device'),
 (1596,63087,'Blood glucose/blood pressure monitoring system, home-use','IVistB','IVD Annex II List B','IVDD','In Vitro Diagnostic Device'),
 (1896,33664,'Cruciate-retaining total knee prosthesis','ClsIIb','Class IIb','GMD','General Medical Device'),
 (4258,35838,'Ambulatory insulin infusion pump reservoir','ClsIIb','Class IIb','GMD','General Medical Device'),
 (4455,63491,'Eye irrigation shield, reusable','ClassI','Class I','GMD','General Medical Device'),
 (4523,35197,'Bedside heart rate monitor','ClsIIa','Class IIa','GMD','General Medical Device'),
 (4567,63088,'Blood glucose/blood pressure monitoring system, point-of-care','IVeral','IVD General','IVDD','In Vitro Diagnostic Device'),
 (4623,14450,'Hydrotherapy bath/tank','ClsIIa','Class IIa','GMD','General Medical Device'),
 (4624,33581,'Coated hip femur prosthesis, modular','ClsIII','Class III','GMD','General Medical Device'),
 (5362,14034,'Continuous electronic patient thermometer, battery-powered','ClsIIa','Class IIa','GMD','General Medical Device'),
 (6324,38501,'Insulin syringe/needle, basic','ClsIIa','Class IIa','GMD','General Medical Device'),
 (6523,35197,'Bedside heart rate monitor','ClsIIa','Class IIa','GMD','General Medical Device'),
 (6542,35197,'Bedside heart rate monitor','ClsIIa','Class IIa','GMD','General Medical Device'),
 (7895,36386,'Automated ophthalmic refractometer','ClassI','Class I','GMD','General Medical Device');
INSERT INTO "device_make" ("make_id","udi_number","model_id","is_model","brand_trade_name","product_code") VALUES (12467896,1324657985,96325,0,'HydroHeal Plus','751649'),
 (14236541,4563217896,85215,0,'GlucoSense Flex Reader','CENK93434'),
 (15236497,5566948314,46285,1,'Praxis Knee Tibial Component','DN334'),
 (15320469,4520105341,12684,1,'UNIT Hip Liner','56216'),
 (16234975,1615626554,12684,1,'UNIT Hip Stem 9mm','56213'),
 (18236541,5673194589,79315,0,'Clear Eye Shield Sterile','EF3232'),
 (19764325,1111444456,12365,0,'Omega Gentle Temp 521 Thermometer','JU342'),
 (21649535,4478852562,46285,1,'Praxis Knee Femoral Compnent','DN333'),
 (28462513,1264547357,12684,1,'UNIT Hip Cup 9mm','56214'),
 (45236891,4452213369,15296,0,'Heart Age Assessment Tool','C3489F'),
 (46523195,1111223654,45621,0,'Blood pressure cuff multi patient use 16cm-28cm no connector','FW34342'),
 (64782315,1122366543,75314,0,'Cardiac pacemaker pack','KL290'),
 (73516943,1454424355,12684,1,'UNIT Hip Ball 9mm','56215'),
 (74589621,1522446658,78965,0,'InsuFlow Pro 300 Pump System','FK54354'),
 (74652319,1523463265,35746,0,'Ophthalmic lens','G4567-C'),
 (78514623,5132649785,65432,0,'BetaPlex 4000 Dynamic','RE-191'),
 (78954612,6632145789,46285,1,'Praxis Knee Plastic Spacer','DN335'),
 (84123596,1523455265,95146,0,'Heart Rate Monitor','2124-23-66'),
 (94621578,2184663215,85214,0,'Insulin Safety Syringe with Fixed Needle','7824526'),
 (96541235,4561231522,65432,0,'BetaPlex 4000 Static','RE-190');

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
	(4, 'Portsmouth Hospitals University NHS Trust'),
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
  (1234, 'May-26',  '21/11/2026', '21/11/2025',  NULL, NULL, 2, 2, 1, 1, NULL, NULL, NULL,                                              'NJR report',        'NJR_report_1_FAKE.pdf'),
  (4567, 'Jul-26',  NULL,         '2019-2021',   NULL, NULL, 4, 4, 2, 1, 1,    484,  'Gastroenterology Unit, Queen Alexandra Hospital',  'Trust clinical trial', 'Portsmouth Hospitals University NHS Trust clinical trial FAKE.pdf'),
  (7891, 'Jul-26',  NULL,         'Jan24-Jun24', NULL, NULL, 6, 7, 2, 1, 0,    NULL, 'Ward 3, Northumbria Specialist Emergency Care',    'Trust clinical trial', 'Northumbria Healthcare NHS Foundation Trust clinical trial FAKE.pdf'),
  (8912, 'Jul-26',  NULL,         'Feb23-May24', NULL, NULL, 5, 5, 2, 1, 1,    50,   'Urology department, Guy''s Hospital',              'Trust clinical trial', 'Guys St Thomas NHS trist clinical trial FAKE.pdf'),
  (9123, 'Jul-26',  NULL,         'Jan-23',      NULL, NULL, 3, 3, 2, 1, 1,    NULL, 'Dialysis Unit, St Bartholomew''s Hospital',        'Trust business case',  'Barts Health NHS Trust business case FAKE.pdf'),
  (13456,'Jul-26',  NULL,         'Mar23-Aug23', NULL, NULL, 7, 6, 2, 1, 1,    NULL, 'Oncology Day Unit, Queen Elizabeth Hospital',      'Trust evaluation',     'University Hospitals Birmingham NHS Foundation Trust evaluation FAKE.pdf');

-- All documents linked to make_id 45236891, other make_ids only have some of the documents linked to them
INSERT INTO "matches_make" ("make_match_id","make_id","document_id") VALUES 
 (1,45236891,4567),
 (2,64782315,4567),
 (3,84123596,4567),
 (4,45236891,8912),
 (5,64782315,8912),
 (6,84123596,8912),
 (7,74652319,13456),
 (8,74652319,7891),
 (9,94621578,9123),
 (10,74589621,9123),
 (11,74589621,9123),
 (12,96541235,4567),
 (13,78514623,4567),
 (14,12467896,9123),
 (15,14236541,9123),
 (16,12467896,8912),
 (17,14236541,8912),
 (18,46523195,4567),
 (19,19764325,13456),
 (20,18236541,9123),
 (21,21649535,1234),
 (22,15236497,1234),
 (23,78954612,1234),
 (24,21649535,7891),
 (25,15236497,7891),
 (26,78954612,7891),
 (27,21649535,13456),
 (28,15236497,13456),
 (29,78954612,13456),
 (30,16234975,1234),
 (31,28462513,1234),
 (32,73516943,1234),
 (33,15320469,1234),
 (34,16234975,8912),
 (35,28462513,8912),
 (36,73516943,8912),
 (37,15320469,8912),
 (38,45236891,1234),
 (39,45236891,7891),
 (40,45236891,9123),
 (41,45236891,13456);

-- MAKE_ID 45236891 matches the make_id used in matches_make above
INSERT INTO "search" ("MAKE_ID","MODEL_ID","DEVICE_ID","MAKE","MODEL","GMDN_NAME","TYPE","PRODUCT_CODE","MANUFACTURER","COUNTRY","UDI","GMDN_CODE") VALUES (12467896,96325,4623,'HydroHeal Plus','HydroHeal Plus','Hydrotherapy bath/tank','General Medical Device','751649','Aquatech Ltd','Wales, United Kingdom',1324657985,14450),
 (14236541,85215,1596,'GlucoSense Flex Reader','GlucoSense','Blood glucose/blood pressure monitoring system, home-use','In Vitro Diagnostic Device','CENK93434','Saccharine & Sons','England, United Kingdom',4563217896,63087),
 (15236497,46285,1896,'Praxis Knee Tibial Component','Praxis Total Knee','Cruciate-retaining total knee prosthesis','General Medical Device','DN334','Praxis & Co','England, United Kingdom',5566948314,33664),
 (15320469,12684,4623,'UNIT Hip Liner','UNIT Artifical Hip','Hydrotherapy bath/tank','General Medical Device','56216','Upper Norfolk Implant Technologies','United States',4520105341,14450),
 (16234975,12684,4623,'UNIT Hip Stem 9mm','UNIT Artifical Hip','Hydrotherapy bath/tank','General Medical Device','56213','Upper Norfolk Implant Technologies','United States',1615626554,14450),
 (18236541,79315,4455,'Clear Eye Shield Sterile','Eye Shield','Eye irrigation shield, reusable','General Medical Device','EF3232','Epsilon tech Ltd','Northern Ireland, United Kingdom',5673194589,63491),
 (19764325,12365,5362,'Omega Gentle Temp 521 Thermometer','Thermometer tympanic device','Continuous electronic patient thermometer, battery-powered','General Medical Device','JU342','OmegaAM Solutions','Netherlands',1111444456,14034),
 (21649535,46285,1896,'Praxis Knee Femoral Compnent','Praxis Total Knee','Cruciate-retaining total knee prosthesis','General Medical Device','DN333','Praxis & Co','England, United Kingdom',4478852562,33664),
 (28462513,12684,4623,'UNIT Hip Cup 9mm','UNIT Artifical Hip','Hydrotherapy bath/tank','General Medical Device','56214','Upper Norfolk Implant Technologies','United States',1264547357,14450),
 (45236891,15296,6542,'Heart Age Assessment Tool','Heart Pro','Bedside heart rate monitor','General Medical Device','C3489F','Aorta Solutions','Scotland, United Kingdom',4452213369,35197),
 (46523195,45621,4567,'Blood pressure cuff multi patient use 16cm-28cm no connector','Blood Pressure Kit','Blood glucose/blood pressure monitoring system, point-of-care','In Vitro Diagnostic Device','FW34342','Ferrus Technology Solutions','Scotland, United Kingdom',1111223654,63088),
 (64782315,75314,6523,'Cardiac pacemaker pack','Pacemaker','Bedside heart rate monitor','General Medical Device','KL290','Aorta Solutions','Scotland, United Kingdom',1122366543,35197),
 (73516943,12684,4623,'UNIT Hip Ball 9mm','UNIT Artifical Hip','Hydrotherapy bath/tank','General Medical Device','56215','Upper Norfolk Implant Technologies','United States',1454424355,14450),
 (74589621,78965,4258,'InsuFlow Pro 300 Pump System','InsuFlow Pro','Ambulatory insulin infusion pump reservoir','General Medical Device','FK54354','ArcTech Ltd','England, United Kingdom',1522446658,35838),
 (74652319,35746,7895,'Ophthalmic lens','Opthalmic','Automated ophthalmic refractometer','General Medical Device','G4567-C','Seinar Systems Ltd','Austria',1523463265,36386),
 (78514623,65432,1258,'BetaPlex 4000 Dynamic','BetaPlex 4000','Cochlear implant system','Active Implantable Device','RE-191','Beta Healthcare Solutions','England, United Kingdom',5132649785,35643),
 (78954612,46285,1896,'Praxis Knee Plastic Spacer','Praxis Total Knee','Cruciate-retaining total knee prosthesis','General Medical Device','DN335','Praxis & Co','England, United Kingdom',6632145789,33664),
 (84123596,95146,4523,'Heart Rate Monitor','Heart Rate Monitor','Bedside heart rate monitor','General Medical Device','2124-23-66','Aorta Solutions','Scotland, United Kingdom',1523455265,35197),
 (94621578,85214,6324,'Insulin Safety Syringe with Fixed Needle','Insulin Kit','Insulin syringe/needle, basic','General Medical Device','7824526','Chumley Technologies','England, United Kingdom',2184663215,38501),
 (96541235,65432,1258,'BetaPlex 4000 Static','BetaPlex 4000','Cochlear implant system','Active Implantable Device','RE-190','Beta Healthcare Solutions','England, United Kingdom',4561231522,35643);


-- Contacts for documents
INSERT INTO contacts (contact_id, title, given_name, surname, email, phone_no, role) VALUES
  	(1, 'Dr', 'Jeana', 'Somerfield', 'jsomerfield0@nhs.net', '01373 644493', 'Staff Scientist, Clinical Research'),
	(2, 'Dr', 'Jessika', 'Boulton', 'jboulton1@nhs.net', '07341 050 616', 'Doctor, Emergency Medicine'),
	(3, 'Mr', 'Andris', 'Naldrett', null, '01234 56789', 'Statistician, Clinical Trials'),
	(4, 'Ms', 'Alena', 'Colomb', 'acolomb3@nhs.net', null, 'Nurse, Ward 3'),
	(5, 'Ms', 'Emogene', 'Roblett', 'eroblett4@nhs.net', null, 'Design manager, Clinical Trials'),
	(6, 'Mrs', 'Sara', 'Sparling', 'ssparling5@nhs.net', null, 'Speech Pathologist, Therapy Services'),
	(7, 'Ms', 'Hortensia', 'Sinnott', null, '09133 181656', 'Senior Clinician, Clinical Trials'),
	(8, 'Miss', 'Louisette', 'Vanns', null, '05606 190909', 'Medical Informatics Specialist, Statistics'),
	(9, 'Ms', 'Mahalia', 'Immings', null, '06431 047410', 'Software Engineer I, Software Development'),
	(10, 'Ms', 'Jackelyn', 'Gricewood', 'jgricewood9@nhs.net', null, 'Implant Specialist, Orthopaedic Surgery');

  
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

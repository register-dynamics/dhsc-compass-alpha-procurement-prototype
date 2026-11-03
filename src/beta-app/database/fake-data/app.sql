TRUNCATE TABLE "app"."evidence_type" CASCADE;
-- NOTICE:  truncate cascades to table "evidence"
-- NOTICE:  truncate cascades to table "documents"
-- NOTICE:  truncate cascades to table "evidence_contacts"
-- NOTICE:  truncate cascades to table "product_evidence"
-- NOTICE:  truncate cascades to table "product_evidence_useful"

TRUNCATE TABLE "app"."document_type" CASCADE;
-- NOTICE:  truncate cascades to table "documents"
-- NOTICE:  truncate cascades to table "evidence_contacts"
-- NOTICE:  truncate cascades to table "product_documents_useful"

TRUNCATE TABLE "app"."org_type" CASCADE;
-- NOTICE:  truncate cascades to table "organisations"
-- NOTICE:  truncate cascades to table "documents"
-- NOTICE:  truncate cascades to table "evidence"
-- NOTICE:  truncate cascades to table "evidence_contacts"
-- NOTICE:  truncate cascades to table "product_evidence"
-- NOTICE:  truncate cascades to table "product_documents_useful"

TRUNCATE TABLE "app"."org_category" CASCADE;
-- NOTICE:  truncate cascades to table "organisations"
-- NOTICE:  truncate cascades to table "documents"
-- NOTICE:  truncate cascades to table "evidence_contacts"
-- NOTICE:  truncate cascades to table "product_evidence"
-- NOTICE:  truncate cascades to table "product_documents_useful"

TRUNCATE TABLE "app"."contacts" CASCADE;
-- NOTICE:  truncate cascades to table "evidence_contacts"

TRUNCATE TABLE "app"."users" CASCADE;
-- NOTICE:  truncate cascades to table "product_documents_useful"

INSERT INTO "app"."evidence_type" ("type_of_evidence_id","type_of_evidence_desc") VALUES
 (1,'ODEP assessment'),
 (2,'NJR report'),
 (3,'Business case'),
 (4,'Clinical trial funded by supplier'),
 (5,'Clinical trial uploaded by supplier'),
 (6,'Clinical trial with supplier response'),
 (7,'Evaluation'),
 (8,'Generic');

INSERT INTO "app"."document_type" ("type_of_doc_id","type_of_doc_desc") VALUES
 (1,'ODEP assessment'),
 (2,'NJR report'),
 (3,'Business case'),
 (4,'Clinical trial funded by supplier'),
 (5,'Clinical trial uploaded by supplier'),
 (6,'Clinical trial with supplier response'),
 (7,'Evaluation');

INSERT INTO "app"."org_type" ("org_type_id","org_type_desc") VALUES
 (1,'Independent Assessment Body'),
 (2,'NHS Trust');

INSERT INTO "app"."org_category" ("org_category_id","org_category_desc") VALUES
 (1,'Trusted');

INSERT INTO "app"."organisations" ("organisation_id","organisation_name","org_type_id","org_category_id") VALUES
 (1,'ODEP',1,1),
 (2,'NJR',1,1),
 (3,'Barts Health NHS Trust',2,1),
 (4,'Portsmouth Hospitals University NHS Trust',2,1),
 (5,'Guys & St Thomas'' NHS Foundation Trust',2,1),
 (6,'University Hospitals Birmingham NHS Foundation Trust',2,1),
 (7,'Northumbria Healthcare NHS Foundation Trust',2,1);

INSERT INTO "app"."contacts" ("contact_id","title","given_name","surname","email","phone_no","role") VALUES
 (1,NULL,'Jeana','Somerfield','jsomerfield0@nhs.net','1373644493','Staff Scientist, Clinical Research'),
 (2,NULL,'Jessika','Boulton','jboulton1@nhs.net','7341050616','Doctor, Emergency Medicine'),
 (3,NULL,'Andris','Naldrett',NULL,'0123456789','Statistician, Clinical Trials'),
 (4,NULL,'Alena','Colomb','acolomb3@nhs.net',NULL,'Nurse, Ward 3'),
 (5,NULL,'Emogene','Roblett','eroblett4@nhs.net',NULL,'Design manager, Clinical Trials'),
 (6,NULL,'Sara','Sparling','ssparling5@nhs.net',NULL,'Speech Pathologist, Therapy Services'),
 (7,NULL,'Hortensia','Sinnott',NULL,'9133181656','Senior Clinician, Clinical Trials'),
 (8,NULL,'Louisette','Vanns',NULL,'5606190909','Medical Informatics Specialist, Statistics'),
 (9,NULL,'Mahalia','Immings',NULL,'6431047410','Software Engineer I, Software Development'),
 (10,NULL,'Jackelyn','Gricewood','jgricewood9@nhs.net',NULL,'Implant Specialist, Orthopaedic Surgery');

INSERT INTO "app"."evidence" (evidence_id, created_at, modified_at, assessment_date, assessment_date_desc, rating, rating_type, organisation_id, procured, scale, ward_department, summary, type_of_evidence_id) VALUES
       (1234, '2026-09-23 08:28:02.86937', NULL, '21/11/2025', NULL, NULL, NULL, 2, NULL, NULL, NULL, 'NJR report', 2),
       (4567, '2026-09-23 08:28:02.86937', NULL, '2019-2021', NULL, NULL, NULL, 4, true, 484, 'Gastroenterology Unit, Queen Alexandra Hospital', 'Trust clinical trial', 4),
       (7891, '2026-09-23 08:28:02.86937', NULL, 'Jan24-Jun24', NULL, NULL, NULL, 7, false, NULL, 'Ward 3, Northumbria Specialist Emergency Care', 'Trust clinical trial', 6),
       (8912, '2026-09-23 08:28:02.86937', NULL, 'Feb23-May24', NULL, NULL, NULL, 5, true, 50, 'Urology department, Guy''s Hospital', 'Trust clinical trial', 5),
       (9123, '2026-09-23 08:28:02.86937', NULL, 'Jan-23', NULL, NULL, NULL, 3, true, NULL, 'Dialysis Unit, St Bartholomew''s Hospital', 'Trust business case', 3),
       (13456, '2026-09-23 08:28:02.86937', NULL, 'Mar23-Aug23', NULL, NULL, NULL, 6, true, NULL, 'Oncology Day Unit, Queen Elizabeth Hospital', 'Trust evaluation', 7),
       (4321, '2026-09-23 08:28:02.86937', NULL, 'Mar23-Aug23', NULL, NULL, NULL, 6, true, NULL, NULL, 'Pre-Evaluation Research', 8);

INSERT INTO "app"."documents" ("document_id","upload_date","expiry_date","revision_date","type_of_doc_id","organisation_id","summary","is_update","parent_id","url_directory","evidence_id") VALUES
       (1234, '2026-05-01 00:00:00', '2026-11-21 00:00:00', NULL, 2, 2, 'NJR report', NULL, NULL, 'NJR_report_1_FAKE.pdf', 1234),
       (4567, '2026-07-01 00:00:00', NULL, NULL, 4, 4, 'Trust clinical trial', NULL, NULL, 'Portsmouth Hospitals University NHS Trust clinical trial FAKE.pdf', 4567),
       (7891, '2026-07-01 00:00:00', NULL, NULL, 6, 7, 'Trust clinical trial', NULL, NULL, 'Northumbria Healthcare NHS Foundation Trust clinical trial FAKE.pdf', 7891),
       (8912, '2026-07-01 00:00:00', NULL, NULL, 5, 5, 'Trust clinical trial', NULL, NULL, 'Guys St Thomas NHS trist clinical trial FAKE.pdf', 8912),
       (9123, '2026-07-01 00:00:00', NULL, NULL, 3, 3, 'Trust business case', NULL, NULL, 'Barts Health NHS Trust business case FAKE.pdf', 9123),
       (13456, '2026-07-01 00:00:00', NULL, NULL, 7, 6, 'Trust evaluation', NULL, NULL, 'University Hospitals Birmingham NHS Foundation Trust evaluation FAKE.pdf', 13456);

INSERT INTO "app"."evidence_contacts" ("evidence_id","contact_id","discuss_implementation","discuss_training","discuss_outcomes","discuss_pharmacy_integration","discuss_business_case","discuss_real_world_use","discuss_ehr_integration") VALUES
 (1234,1,TRUE,FALSE,FALSE,FALSE,FALSE,FALSE,FALSE),
 (1234,2,TRUE,TRUE,FALSE,FALSE,FALSE,FALSE,FALSE),
 (4567,3,FALSE,TRUE,TRUE,FALSE,FALSE,FALSE,FALSE),
 (4567,4,FALSE,FALSE,TRUE,TRUE,FALSE,FALSE,FALSE),
 (7891,5,FALSE,FALSE,FALSE,TRUE,TRUE,FALSE,FALSE),
 (7891,6,FALSE,FALSE,FALSE,FALSE,TRUE,TRUE,FALSE),
 (8912,7,TRUE,TRUE,TRUE,TRUE,TRUE,TRUE,TRUE),
 (8912,8,TRUE,FALSE,FALSE,FALSE,FALSE,FALSE,FALSE),
 (9123,9,FALSE,TRUE,FALSE,TRUE,FALSE,TRUE,FALSE),
 (13456,10,TRUE,TRUE,TRUE,TRUE,TRUE,TRUE,TRUE),
 (4321,10,TRUE,TRUE,TRUE,TRUE,TRUE,TRUE,TRUE);


INSERT INTO "app"."product_evidence" ("aggregation_name","evidence_id") VALUES
 ('Heart Pro',4567),
 ('Pacemaker',4567),
 ('Heart Rate Monitor',4567),
 ('Heart Pro',8912),
 ('Pacemaker',8912),
 ('Heart Rate Monitor',8912),
 ('Opthalmic',13456),
 ('Opthalmic',7891),
 ('Insulin Kit',9123),
 ('InsuFlow Pro',9123),
 ('BetaPlex 4000',4567),
 ('HydroHeal Plus',9123),
 ('GlucoSense',9123),
 ('HydroHeal Plus',8912),
 ('GlucoSense',8912),
 ('Blood Pressure Kit',4567),
 ('Thermometer tympanic device',13456),
 ('Eye Shield',9123),
 ('Praxis Total Knee',1234),
 ('Praxis Total Knee',7891),
 ('Praxis Total Knee',13456),
 ('UNIT Artifical Hip',1234),
 ('UNIT Artifical Hip',8912),
 ('Heart Pro',1234),
 ('Heart Pro',7891),
 ('Heart Pro',9123),
 ('Heart Pro',13456),
 ('Heart Pro',4321);
 

-- Seed user for beta app login
INSERT INTO app.users (id, username, password_hash, given_name, last_name) VALUES
  (1, 'test@example.com', '$argon2id$v=19$m=65536,p=4,t=3$FOt9ovCYjfa8MBG+0xhOiA$ql+3cvHd48lV8auNcHSU/Wjw3Lfr1IFRRroA32XFhKM', 'Johnny', 'Test');

-- Seed user organisation association
INSERT INTO app.organisation_user (organisation_id, user_id) VALUES
  (3, 1);

-- Update sequences for tables that were missing identity columns
SELECT setval(pg_get_serial_sequence('"app"."contacts"', 'contact_id'), COALESCE((SELECT MAX("contact_id") FROM "app"."contacts"), 1));
SELECT setval(pg_get_serial_sequence('"app"."document_type"', 'type_of_doc_id'), COALESCE((SELECT MAX("type_of_doc_id") FROM "app"."document_type"), 1));
SELECT setval(pg_get_serial_sequence('"app"."org_category"', 'org_category_id'), COALESCE((SELECT MAX("org_category_id") FROM "app"."org_category"), 1));
SELECT setval(pg_get_serial_sequence('"app"."org_type"', 'org_type_id'), COALESCE((SELECT MAX("org_type_id") FROM "app"."org_type"), 1));
SELECT setval(pg_get_serial_sequence('"app"."organisations"', 'organisation_id'), COALESCE((SELECT MAX("organisation_id") FROM "app"."organisations"), 1));

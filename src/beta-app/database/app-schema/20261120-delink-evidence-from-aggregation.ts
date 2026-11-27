import { Kysely, sql } from "kysely";

import { up as createEvidenceLink } from "./20261030-01-link-evidence-to-aggregation.js";
import { up as createUsefulEvidence } from "./20261103-01-link-useful-to-aggregation.js";
import { up as createSupplierEvidence } from "./20261110-01-link-evidence-to-supplier.js";

import { down as dropEvidenceLink } from "./20261030-01-link-evidence-to-aggregation.js";
import { down as dropUsefulEvidence } from "./20261103-01-link-useful-to-aggregation.js";
import { down as dropSupplierEvidence } from "./20261110-01-link-evidence-to-supplier.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await createEvidenceLink(db);
  await createUsefulEvidence(db);
  await createSupplierEvidence(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await dropSupplierEvidence(db);
  await dropUsefulEvidence(db);
  await dropEvidenceLink(db);
}

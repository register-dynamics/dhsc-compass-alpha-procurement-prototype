import { sql } from "kysely";

import { db } from "../database/client.js";

// "Available trust data" cards summarise the trusts with experience of a set
// of devices. Each page has 2 cards: devices matching the page exactly, and
// devices in the same or related categories. The related card leaves out
// what's on the exact card, so the two don't overlap.
//
// | Page                   | Exact card                         | Related card                                   |
// | ---------------------- | ---------------------------------- | ---------------------------------------------- |
// | Product                | The aggregation, for its supplier  | The supplier's other aggregations with the     |
// |                        |                                    | same or a related GMDN term                    |
// | Supplier + device type | The supplier, for the GMDN term    | The supplier, for related GMDN terms           |
// | Device type            | Every supplier, for the GMDN term  | Every supplier, for related GMDN terms         |
//
// Contracts are matched to devices by GMDN term (atamis_to_gmdn) and to
// suppliers by contracts_to_mhra_manufacturers. Contracts aren't linked to
// aggregations, so a product's exact contracts are its supplier's contracts
// for its GMDN terms, and its related contracts are its supplier's contracts
// for related terms that aren't also for its own.

export interface RelatedContract {
  contractName: string;
  contractRef: string;
  primaryCategory: string;
  startDate: Date;
  trust: string;
}

// An aggregation is identified by its name and supplier, as different
// suppliers can use the same aggregation name for unrelated products
export interface SupplierAggregation {
  aggregationName: string;
  manufacturerId: number;
}

export interface TrustData {
  contractCount: number;
  documentCounts: { count: number; documentType: string }[];
  peopleCount: number;
  // Trusts with evidence or a contract, each counted once
  trustCount: number;
}

export interface TrustDataCards {
  exact: TrustData;
  related: TrustData;
}

interface TrustDataScope {
  // Contracts for any of these GMDN terms, unless they're also for one of
  // the excluded terms
  contractGmdnCodes: number[];
  // Evidence linked to any of these aggregations
  evidenceAggregations: SupplierAggregation[];
  excludedContractGmdnCodes?: number[];
  // Only contracts with this supplier
  manufacturerId?: number;
}

export const getProductTrustData = async (
  aggregation: SupplierAggregation,
): Promise<TrustDataCards> => {
  const scopes = await getProductScopes(aggregation);

  const [exact, related] = await Promise.all([
    getTrustData(scopes.exact),
    getTrustData(scopes.related),
  ]);

  return { exact, related };
};

// The contracts counted on the product page's related card
export const getProductRelatedContracts = async (
  aggregation: SupplierAggregation,
): Promise<RelatedContract[]> => {
  const { related } = await getProductScopes(aggregation);

  return (await getContracts(related)).map(
    ({ contractingAuthority, ...contract }) => ({
      ...contract,
      trust: contractingAuthority,
    }),
  );
};

const getProductScopes = async (
  aggregation: SupplierAggregation,
): Promise<{ exact: TrustDataScope; related: TrustDataScope }> => {
  const gmdnCodes = await getGmdnCodesForAggregation(aggregation);
  const relatedGmdnCodes = await getRelatedGmdnCodes(gmdnCodes);
  const supplierAggregations = await getAggregationsWithGmdnCodes(
    [...gmdnCodes, ...relatedGmdnCodes],
    aggregation.manufacturerId,
  );

  return {
    exact: {
      contractGmdnCodes: gmdnCodes,
      evidenceAggregations: [aggregation],
      manufacturerId: aggregation.manufacturerId,
    },
    related: {
      contractGmdnCodes: relatedGmdnCodes,
      evidenceAggregations: supplierAggregations.filter(
        ({ aggregationName }) =>
          aggregationName !== aggregation.aggregationName,
      ),
      excludedContractGmdnCodes: gmdnCodes,
      manufacturerId: aggregation.manufacturerId,
    },
  };
};

// Leave out manufacturerId for every supplier of the device type
export const getDeviceTypeTrustData = async (
  gmdnCode: number,
  manufacturerId?: number,
): Promise<TrustDataCards> => {
  const relatedGmdnCodes = await getRelatedGmdnCodes([gmdnCode]);

  const [exactAggregations, relatedAggregations] = await Promise.all([
    getAggregationsWithGmdnCodes([gmdnCode], manufacturerId),
    getAggregationsWithGmdnCodes(relatedGmdnCodes, manufacturerId),
  ]);

  const [exact, related] = await Promise.all([
    getTrustData({
      contractGmdnCodes: [gmdnCode],
      evidenceAggregations: exactAggregations,
      manufacturerId,
    }),
    getTrustData({
      contractGmdnCodes: relatedGmdnCodes,
      // An aggregation can span several GMDN terms, so one that's also for
      // this term is on the exact card
      evidenceAggregations: relatedAggregations.filter(
        (related) =>
          !exactAggregations.some((exact) => isSameAggregation(exact, related)),
      ),
      excludedContractGmdnCodes: [gmdnCode],
      manufacturerId,
    }),
  ]);

  return { exact, related };
};

// GMDN terms are related when one's most specific Device Function category
// holds the other, at or beneath it. Device Function is the tree people
// browse; Anatomical Specialty and Names Index group by body area and name,
// which would bring in much less similar devices.
//
// "Most specific" alone isn't symmetric: an insulin pump tank's most specific
// category is "Fluid infusion/injection devices", which holds insulin
// syringes, but a syringe's most specific category is narrower and doesn't
// hold the tank. Checking both ways means each is related to the other.
//
// The given terms themselves are never included.
export const getRelatedGmdnCodes = async (
  gmdnCodes: number[],
): Promise<number[]> => {
  if (gmdnCodes.length === 0) {
    return [];
  }

  const codes = sql`${gmdnCodes}::integer[]`;

  const { rows } = await sql<{ gmdnCode: number }>`
    WITH RECURSIVE device_function AS (
      SELECT node_id, category_code, 1 AS depth, ARRAY[node_id] AS path
      FROM external.gmdn_category
      WHERE parent_id IS NULL AND name = 'Device Function'
      UNION ALL
      SELECT c.node_id, c.category_code, df.depth + 1, df.path || c.node_id
      FROM external.gmdn_category c
      INNER JOIN device_function df ON c.parent_id = df.node_id
    ),
    -- Every place in the tree a term is listed, with the categories above it
    term_nodes AS (
      SELECT ct.term_code, df.node_id, df.depth, df.path
      FROM external.gmdn_category_term ct
      INNER JOIN device_function df ON df.category_code = ct.category_code
    ),
    given_nodes AS (
      SELECT * FROM term_nodes WHERE term_code = ANY(${codes})
    ),
    -- Categories at or above where the given terms are listed. Only terms
    -- listed in one of these can have a most specific category holding them.
    given_ancestors AS (
      SELECT DISTINCT unnest(path) AS node_id FROM given_nodes
    ),
    candidates AS (
      SELECT DISTINCT tn.term_code
      FROM term_nodes tn
      INNER JOIN given_ancestors ga ON ga.node_id = tn.node_id
    ),
    most_specific AS (
      SELECT term_code, node_id
      FROM (
        SELECT
          tn.term_code,
          tn.node_id,
          rank() OVER (PARTITION BY tn.term_code ORDER BY tn.depth DESC) AS depth_rank
        FROM term_nodes tn
        WHERE tn.term_code = ANY(${codes})
          OR tn.term_code IN (SELECT term_code FROM candidates)
      ) ranked
      WHERE depth_rank = 1
    ),
    related AS (
      -- Terms held by a given term's most specific category
      SELECT tn.term_code
      FROM most_specific ms
      INNER JOIN term_nodes tn ON ms.node_id = ANY(tn.path)
      WHERE ms.term_code = ANY(${codes})
      UNION
      -- Terms whose most specific category holds a given term
      SELECT ms.term_code
      FROM most_specific ms
      INNER JOIN given_ancestors ga ON ga.node_id = ms.node_id
    )
    SELECT DISTINCT term_code AS gmdn_code
    FROM related
    WHERE NOT term_code = ANY(${codes})
    ORDER BY gmdn_code
  `.execute(db);

  return rows.map((row) => row.gmdnCode);
};

const getGmdnCodesForAggregation = async ({
  aggregationName,
  manufacturerId,
}: SupplierAggregation): Promise<number[]> => {
  const rows = await db
    .withSchema("external")
    .selectFrom("products as p")
    .innerJoin("device_type as dt", "dt.deviceId", "p.deviceId")
    .select("dt.gmdnCode")
    .distinct()
    .where("p.aggregationName", "=", aggregationName)
    .where("p.manufacturerId", "=", manufacturerId)
    .where("dt.gmdnCode", "is not", null)
    .execute();

  return rows.flatMap((row) => row.gmdnCode ?? []);
};

const getAggregationsWithGmdnCodes = async (
  gmdnCodes: number[],
  manufacturerId?: number,
): Promise<SupplierAggregation[]> => {
  if (gmdnCodes.length === 0) {
    return [];
  }

  let query = db
    .withSchema("external")
    .selectFrom("products as p")
    .innerJoin("device_type as dt", "dt.deviceId", "p.deviceId")
    .select(["p.aggregationName", "p.manufacturerId"])
    .distinct()
    .where("dt.gmdnCode", "in", gmdnCodes);

  if (manufacturerId !== undefined) {
    query = query.where("p.manufacturerId", "=", manufacturerId);
  }

  const rows = await query.execute();

  return rows.flatMap(({ aggregationName, manufacturerId }) =>
    aggregationName ? [{ aggregationName, manufacturerId }] : [],
  );
};

const isSameAggregation = (a: SupplierAggregation, b: SupplierAggregation) =>
  a.aggregationName === b.aggregationName &&
  a.manufacturerId === b.manufacturerId;

const getTrustData = async (scope: TrustDataScope): Promise<TrustData> => {
  const [evidence, contracts] = await Promise.all([
    getEvidenceData(scope.evidenceAggregations),
    getContracts(scope),
  ]);

  // Atamis names trusts as contracting authorities, which are matched to
  // organisations by name
  const trusts = new Set([
    ...evidence.organisationNames,
    ...contracts.map((contract) => contract.contractingAuthority),
  ]);

  return {
    contractCount: contracts.length,
    documentCounts: evidence.documentCounts,
    peopleCount: evidence.peopleCount,
    trustCount: trusts.size,
  };
};

const getEvidenceData = async (aggregations: SupplierAggregation[]) => {
  if (aggregations.length === 0) {
    return { documentCounts: [], organisationNames: [], peopleCount: 0 };
  }

  const evidenceRows = await db
    .withSchema("app")
    .selectFrom("product_evidence as pe")
    .innerJoin("evidence as e", "e.evidenceId", "pe.evidenceId")
    .innerJoin("organisations as o", "o.organisationId", "e.organisationId")
    .select(["e.evidenceId", "o.organisationName"])
    .distinct()
    .where((eb) =>
      eb(
        eb.refTuple("pe.aggregationName", "pe.manufacturerId"),
        "in",
        aggregations.map(({ aggregationName, manufacturerId }) =>
          eb.tuple(aggregationName, manufacturerId),
        ),
      ),
    )
    .execute();

  if (evidenceRows.length === 0) {
    return { documentCounts: [], organisationNames: [], peopleCount: 0 };
  }

  const evidenceIds = evidenceRows.map((row) => row.evidenceId);

  // Contacts and documents are counted in separate queries so the joins
  // don't fan out against each other
  const [people, documentRows] = await Promise.all([
    db
      .withSchema("app")
      .selectFrom("evidence_contacts")
      .select((eb) => eb.fn.count<string>("contactId").distinct().as("count"))
      .where("evidenceId", "in", evidenceIds)
      .executeTakeFirstOrThrow(),
    db
      .withSchema("app")
      .selectFrom("documents as d")
      .innerJoin("document_type as dt", "dt.typeOfDocId", "d.typeOfDocId")
      .select((eb) => [
        "dt.typeOfDocDesc as documentType",
        eb.fn.count<string>("d.documentId").distinct().as("count"),
      ])
      .where("d.evidenceId", "in", evidenceIds)
      .groupBy(["dt.typeOfDocId", "dt.typeOfDocDesc"])
      .orderBy("count", "desc")
      .orderBy("documentType", "asc")
      .execute(),
  ]);

  return {
    documentCounts: documentRows.map((row) => ({
      count: Number(row.count),
      documentType: row.documentType,
    })),
    organisationNames: evidenceRows.map((row) => row.organisationName),
    peopleCount: Number(people.count),
  };
};

const getContracts = async ({
  contractGmdnCodes,
  excludedContractGmdnCodes = [],
  manufacturerId,
}: TrustDataScope) => {
  if (contractGmdnCodes.length === 0) {
    return [];
  }

  let query = db
    .withSchema("external")
    .selectFrom("atamis_contracts as ac")
    .innerJoin("atamis_to_gmdn as atg", "atg.atamisRef", "ac.contractRef")
    .select([
      "ac.contractRef",
      "ac.contractName",
      "ac.contractingAuthority",
      "ac.primaryCategory",
      "ac.startDate",
    ])
    .distinct()
    .where("atg.gmdnCode", "in", contractGmdnCodes);

  if (excludedContractGmdnCodes.length > 0) {
    query = query.where((eb) =>
      eb.not(
        eb.exists(
          eb
            .selectFrom("atamis_to_gmdn as excluded")
            .select("excluded.atamisRef")
            .whereRef("excluded.atamisRef", "=", "ac.contractRef")
            .where("excluded.gmdnCode", "in", excludedContractGmdnCodes),
        ),
      ),
    );
  }

  if (manufacturerId !== undefined) {
    query = query.where((eb) =>
      eb.exists(
        eb
          .selectFrom("contracts_to_mhra_manufacturers as cm")
          .select("cm.contractRef")
          .whereRef("cm.contractRef", "=", "ac.contractRef")
          .where("cm.manufacturerId", "=", manufacturerId),
      ),
    );
  }

  return await query.execute();
};

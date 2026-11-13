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
// aggregations, so a contract is only a direct match - on the exact card -
// when nothing else it could be for is in doubt:
//
// - it's for exactly one GMDN term, and that's the page's term
// - one of its suppliers has a supplier + device type page for that term
//   (on the supplier and product pages, that supplier is the page's)
// - on the product page, that supplier has no other aggregation for the term
//
// Every other contract for the page's term or a related term - with the
// page's supplier, if it has one - is a possible match, on the related card.

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

interface Contract {
  contractingAuthority: string;
  contractName: string;
  contractRef: string;
  primaryCategory: string;
  startDate: Date;
}

interface ContractCards {
  exact: Contract[];
  related: Contract[];
}

interface ContractScope {
  // The page's own GMDN terms
  gmdnCodes: number[];
  // Only contracts with this supplier
  manufacturerId?: number;
  relatedGmdnCodes: number[];
  // Only a direct match if the supplier has a single aggregation for the term
  soleAggregation?: boolean;
}

export const getProductTrustData = async (
  aggregation: SupplierAggregation,
): Promise<TrustDataCards> => {
  const { contractScope, gmdnCodes, relatedGmdnCodes } =
    await getProductScope(aggregation);

  const [supplierAggregations, contracts] = await Promise.all([
    getAggregationsWithGmdnCodes(
      [...gmdnCodes, ...relatedGmdnCodes],
      aggregation.manufacturerId,
    ),
    getContracts(contractScope),
  ]);

  const [exact, related] = await Promise.all([
    getTrustData([aggregation], contracts.exact),
    getTrustData(
      supplierAggregations.filter(
        ({ aggregationName }) =>
          aggregationName !== aggregation.aggregationName,
      ),
      contracts.related,
    ),
  ]);

  return { exact, related };
};

// The contracts counted on the product page's exact card
export const getProductContracts = async (
  aggregation: SupplierAggregation,
): Promise<Contract[]> => {
  const { contractScope } = await getProductScope(aggregation);

  return (await getContracts(contractScope)).exact;
};

// The contracts counted on the product page's related card
export const getProductRelatedContracts = async (
  aggregation: SupplierAggregation,
): Promise<RelatedContract[]> => {
  const { contractScope } = await getProductScope(aggregation);

  return (await getContracts(contractScope)).related.map(
    ({ contractingAuthority, ...contract }) => ({
      ...contract,
      trust: contractingAuthority,
    }),
  );
};

const getProductScope = async (aggregation: SupplierAggregation) => {
  const gmdnCodes = await getGmdnCodesForAggregation(aggregation);
  const relatedGmdnCodes = await getRelatedGmdnCodes(gmdnCodes);

  return {
    contractScope: {
      gmdnCodes,
      manufacturerId: aggregation.manufacturerId,
      relatedGmdnCodes,
      soleAggregation: true,
    },
    gmdnCodes,
    relatedGmdnCodes,
  };
};

// Leave out manufacturerId for every supplier of the device type
export const getDeviceTypeTrustData = async (
  gmdnCode: number,
  manufacturerId?: number,
): Promise<TrustDataCards> => {
  const relatedGmdnCodes = await getRelatedGmdnCodes([gmdnCode]);

  const [exactAggregations, relatedAggregations, contracts] = await Promise.all(
    [
      getAggregationsWithGmdnCodes([gmdnCode], manufacturerId),
      getAggregationsWithGmdnCodes(relatedGmdnCodes, manufacturerId),
      getContracts({ gmdnCodes: [gmdnCode], manufacturerId, relatedGmdnCodes }),
    ],
  );

  const [exact, related] = await Promise.all([
    getTrustData(exactAggregations, contracts.exact),
    getTrustData(
      // An aggregation can span several GMDN terms, so one that's also for
      // this term is on the exact card
      relatedAggregations.filter(
        (related) =>
          !exactAggregations.some((exact) => isSameAggregation(exact, related)),
      ),
      contracts.related,
    ),
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

// Evidence linked to any of the aggregations, and the given contracts
const getTrustData = async (
  evidenceAggregations: SupplierAggregation[],
  contracts: Contract[],
): Promise<TrustData> => {
  const evidence = await getEvidenceData(evidenceAggregations);

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

// The contracts for the scope's own or related GMDN terms, split into direct
// matches (exact card) and possible matches (related card)
const getContracts = async ({
  gmdnCodes,
  manufacturerId,
  relatedGmdnCodes,
  soleAggregation = false,
}: ContractScope): Promise<ContractCards> => {
  if (gmdnCodes.length === 0 && relatedGmdnCodes.length === 0) {
    return { exact: [], related: [] };
  }

  const codes = sql`${gmdnCodes}::integer[]`;
  const allCodes = sql`${[...gmdnCodes, ...relatedGmdnCodes]}::integer[]`;
  const supplier = sql`${manufacturerId ?? null}::integer`;
  // The supplier has a supplier + device type page for the term if it has an
  // aggregation of that type, and the product page needs it to have only one
  const aggregationCount = soleAggregation ? sql`= 1` : sql`> 0`;

  const { rows } = await sql<Contract & { isExact: boolean }>`
    WITH contract_terms AS (
      SELECT
        atamis_ref,
        count(DISTINCT gmdn_code) AS term_count,
        min(gmdn_code) AS gmdn_code
      FROM external.atamis_to_gmdn
      GROUP BY atamis_ref
    )
    SELECT DISTINCT
      ac.contract_ref,
      ac.contract_name,
      ac.contracting_authority,
      ac.primary_category,
      ac.start_date,
      (
        ct.term_count = 1
        AND ct.gmdn_code = ANY(${codes})
        AND EXISTS (
          SELECT 1
          FROM external.contracts_to_mhra_manufacturers cm
          WHERE cm.contract_ref = ac.contract_ref
            AND (${supplier} IS NULL OR cm.manufacturer_id = ${supplier})
            AND (
              SELECT count(DISTINCT p.aggregation_name)
              FROM external.device_type dt
              INNER JOIN external.products p ON p.device_id = dt.device_id
              WHERE dt.gmdn_code = ct.gmdn_code
                AND dt.manufacturer_id = cm.manufacturer_id
            ) ${aggregationCount}
        )
      ) AS is_exact
    FROM external.atamis_contracts ac
    INNER JOIN contract_terms ct ON ct.atamis_ref = ac.contract_ref
    WHERE EXISTS (
      SELECT 1
      FROM external.atamis_to_gmdn atg
      WHERE atg.atamis_ref = ac.contract_ref
        AND atg.gmdn_code = ANY(${allCodes})
    )
    AND (
      ${supplier} IS NULL
      OR EXISTS (
        SELECT 1
        FROM external.contracts_to_mhra_manufacturers cm
        WHERE cm.contract_ref = ac.contract_ref
          AND cm.manufacturer_id = ${supplier}
      )
    )
  `.execute(db);

  const cards: ContractCards = { exact: [], related: [] };
  for (const { isExact, ...contract } of rows) {
    cards[isExact ? "exact" : "related"].push(contract);
  }

  return cards;
};

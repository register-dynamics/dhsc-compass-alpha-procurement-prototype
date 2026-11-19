import { db } from "../database/client.js";
import { Manufacturer } from "../database/types.js";

export const getSupplierWithId = async (
  supplierId: number,
): Promise<Manufacturer | null> => {
  const supplier = await db
    .withSchema("external")
    .selectFrom("manufacturers")
    .selectAll()
    .where("manufacturerId", "=", supplierId)
    .executeTakeFirst();
  return supplier ?? null;
};

export interface SupplierForDeviceType {
  deviceCount: number;
  manOrganisationName: string;
  manufacturerId: number;
  trustCount: number;
}

// deviceTypeId is a GMDN code
//
// Trusts with available data are found via
// device_type -> products -> (aggregation_name, manufacturer_id)
//   -> app.product_evidence -> app.evidence.
// The tables live in different schemas, so this is two queries merged here.
export const getSuppliersForDeviceType = async (
  deviceTypeId: number,
): Promise<SupplierForDeviceType[]> => {
  const deviceRows = await db
    .withSchema("external")
    .selectFrom("device_type as dt")
    .innerJoin("manufacturers as m", "m.manufacturerId", "dt.manufacturerId")
    .leftJoin("products as p", "p.deviceId", "dt.deviceId")
    .select([
      "m.manufacturerId",
      "m.manOrganisationName",
      "dt.deviceId",
      "p.aggregationName",
    ])
    .where("dt.gmdnCode", "=", deviceTypeId)
    .execute();

  const suppliers = new Map<
    number,
    {
      aggregationNames: Set<string>;
      deviceIds: Set<number>;
      manOrganisationName: string;
    }
  >();

  for (const row of deviceRows) {
    let supplier = suppliers.get(row.manufacturerId);
    if (!supplier) {
      supplier = {
        aggregationNames: new Set(),
        deviceIds: new Set(),
        manOrganisationName: row.manOrganisationName,
      };
      suppliers.set(row.manufacturerId, supplier);
    }
    supplier.deviceIds.add(row.deviceId);
    if (row.aggregationName) {
      supplier.aggregationNames.add(row.aggregationName);
    }
  }

  const allAggregationNames = [
    ...new Set(deviceRows.flatMap((row) => row.aggregationName ?? [])),
  ];

  // Keyed by manufacturer and aggregation name, as different suppliers can use
  // the same aggregation name for unrelated products
  const aggregationKey = (manufacturerId: number, aggregationName: string) =>
    JSON.stringify([manufacturerId, aggregationName]);

  const orgsByAggregation = new Map<string, Set<number>>();
  if (allAggregationNames.length > 0) {
    const evidenceRows = await db
      .withSchema("app")
      .selectFrom("product_evidence as pe")
      .innerJoin("evidence as e", "e.evidenceId", "pe.evidenceId")
      .select(["pe.aggregationName", "pe.manufacturerId", "e.organisationId"])
      .where("pe.aggregationName", "in", allAggregationNames)
      .where("pe.manufacturerId", "in", [...suppliers.keys()])
      .execute();

    for (const row of evidenceRows) {
      const key = aggregationKey(row.manufacturerId, row.aggregationName);
      const orgs = orgsByAggregation.get(key) ?? new Set();
      orgs.add(row.organisationId);
      orgsByAggregation.set(key, orgs);
    }
  }

  return [...suppliers.entries()]
    .map(([manufacturerId, supplier]) => {
      // Union across aggregations so a trust with evidence on several of
      // this supplier's products is only counted once.
      const trusts = new Set<number>();
      for (const name of supplier.aggregationNames) {
        orgsByAggregation
          .get(aggregationKey(manufacturerId, name))
          ?.forEach((orgId) => trusts.add(orgId));
      }
      return {
        deviceCount: supplier.deviceIds.size,
        manOrganisationName: supplier.manOrganisationName,
        manufacturerId,
        trustCount: trusts.size,
      };
    })
    .sort((a, b) => a.manOrganisationName.localeCompare(b.manOrganisationName));
};

export interface SupplierDeviceForDeviceType {
  aggregationName: string;
  trustCount: number;
}

// The devices (product aggregations) a supplier makes under one GMDN code,
// each with the number of trusts that have evidence for it.
export const getDevicesForSupplierAndDeviceType = async (
  deviceTypeId: number,
  supplierId: number,
): Promise<SupplierDeviceForDeviceType[]> => {
  const aggregationRows = await db
    .withSchema("external")
    .selectFrom("device_type as dt")
    .innerJoin("products as p", "p.deviceId", "dt.deviceId")
    .select("p.aggregationName")
    .distinct()
    .where("dt.gmdnCode", "=", deviceTypeId)
    .where("dt.manufacturerId", "=", supplierId)
    .where("p.aggregationName", "is not", null)
    .execute();

  const aggregationNames = aggregationRows.flatMap(
    (row) => row.aggregationName ?? [],
  );
  if (aggregationNames.length === 0) {
    return [];
  }

  const trustCountRows = await db
    .withSchema("app")
    .selectFrom("product_evidence as pe")
    .innerJoin("evidence as e", "e.evidenceId", "pe.evidenceId")
    .select((eb) => [
      "pe.aggregationName",
      eb.fn.count<string>("e.organisationId").distinct().as("trustCount"),
    ])
    .where("pe.aggregationName", "in", aggregationNames)
    .where("pe.manufacturerId", "=", supplierId)
    .groupBy("pe.aggregationName")
    .execute();

  const trustCounts = new Map(
    trustCountRows.map((row) => [row.aggregationName, Number(row.trustCount)]),
  );

  return aggregationNames
    .map((aggregationName) => ({
      aggregationName,
      trustCount: trustCounts.get(aggregationName) ?? 0,
    }))
    .sort((a, b) => a.aggregationName.localeCompare(b.aggregationName));
};

import { Request, Response } from "express";
import { NoResultError } from "kysely";

import { Breadcrumb } from "../models/view-models/breadcrumb.js";
import {
  getBrowsePathForDeviceType,
  getGmdnTermsBeneathCategory,
  getGmdnTermWithCode,
  getHierarchyForCategory,
} from "../services/gmdnCategoryService.js";
import { getSearchQueryString } from "../services/searchQueryService.js";
import {
  getDevicesForSupplierAndDeviceType,
  getSuppliersForDeviceType,
  getSupplierWithId,
  type SupplierDeviceForDeviceType,
} from "../services/supplierService.js";
import { getDeviceTypeTrustData } from "../services/trustDataService.js";

const getCategoryTrail = async (categoryId: number) => {
  if (!Number.isInteger(categoryId)) {
    return [];
  }

  try {
    return await getHierarchyForCategory(categoryId);
  } catch (error) {
    if (error instanceof NoResultError) {
      return [];
    }
    throw error;
  }
};

// A device type sits in many categories, so it has no single path up the tree.
// The category in the URL is the one the user came through. Returns undefined
// if that category doesn't exist or the device type isn't at or beneath it.
const getDeviceTypeInCategory = async (req: Request) => {
  const categoryId = Number(req.params.categoryId);
  const deviceTypeId = Number(req.params.deviceTypeId);

  const trail = await getCategoryTrail(categoryId);
  if (trail.length === 0) {
    return undefined;
  }

  const terms = await getGmdnTermsBeneathCategory(categoryId);
  const term = terms.find(({ gmdnCode }) => gmdnCode === deviceTypeId);
  if (!term) {
    return undefined;
  }

  return {
    breadcrumbs: [
      { href: "/categories", text: "Search and browse" },
      ...trail.map(({ name, nodeId }) => ({
        href: `/category/${String(nodeId)}`,
        text: name,
      })),
    ],
    deviceTypeId,
    deviceTypePath: `/category/${String(categoryId)}/device-type/${String(deviceTypeId)}`,
    gmdnTerm: term.gmdnTermName,
  };
};

export const renderDeviceType = async (req: Request, res: Response) => {
  const deviceType = await getDeviceTypeInCategory(req);

  if (!deviceType) {
    res.status(404).render("not-found");
    return;
  }

  const { breadcrumbs, deviceTypeId, deviceTypePath, gmdnTerm } = deviceType;
  const [suppliers, trustData] = await Promise.all([
    getSuppliersForDeviceType(deviceTypeId),
    getDeviceTypeTrustData(deviceTypeId),
  ]);

  res.render("device-type", {
    breadcrumbs,
    deviceTypePath,
    gmdnTerm,
    suppliers,
    trustData,
  });
};

// A supplier's devices of one type, wherever the page was reached from.
// Returns undefined if the supplier doesn't exist or has no devices of the type.
const getSupplierDevices = async (deviceTypeId: number, supplierId: number) => {
  if (!Number.isInteger(deviceTypeId) || !Number.isInteger(supplierId)) {
    return undefined;
  }

  const [supplier, devices] = await Promise.all([
    getSupplierWithId(supplierId),
    getDevicesForSupplierAndDeviceType(deviceTypeId, supplierId),
  ]);

  if (!supplier || devices.length === 0) {
    return undefined;
  }

  return { devices, supplier };
};

// Each device links to its product page beneath the supplier page, carrying
// any search the supplier page was reached from
const withProductHrefs = (
  devices: SupplierDeviceForDeviceType[],
  productPathPrefix: string,
  searchQueryString = "",
) =>
  devices.map((device) => ({
    ...device,
    href: `${productPathPrefix}/product/${encodeURIComponent(device.aggregationName)}${searchQueryString}`,
  }));

// The supplier's devices of this type, for the path in the URL. Returns
// undefined if any part of that path doesn't exist.
export const getSupplierInCategory = async (req: Request) => {
  const deviceType = await getDeviceTypeInCategory(req);

  if (!deviceType) {
    return undefined;
  }

  const { breadcrumbs, deviceTypeId, deviceTypePath, gmdnTerm } = deviceType;
  const supplierId = Number(req.params.supplierId);
  const supplierDevices = await getSupplierDevices(deviceTypeId, supplierId);

  if (!supplierDevices) {
    return undefined;
  }

  const supplierPath = `${deviceTypePath}/supplier/${String(supplierId)}`;

  return {
    breadcrumbs: [...breadcrumbs, { href: deviceTypePath, text: gmdnTerm }],
    devices: withProductHrefs(supplierDevices.devices, supplierPath),
    deviceTypeId,
    deviceTypePath,
    gmdnTerm,
    supplier: supplierDevices.supplier,
    supplierPath,
  };
};

// The same page reached from search results, so with no category in the URL.
// The breadcrumbs lead back to the search, and the device type link uses a
// category picked for it. Returns undefined if the device type or supplier
// doesn't exist.
const getSupplierInSearch = async (req: Request) => {
  const deviceTypeId = Number(req.params.deviceTypeId);
  const supplierId = Number(req.params.supplierId);

  if (!Number.isInteger(deviceTypeId)) {
    return undefined;
  }

  const [term, supplierDevices, browsePath] = await Promise.all([
    getGmdnTermWithCode(deviceTypeId),
    getSupplierDevices(deviceTypeId, supplierId),
    getBrowsePathForDeviceType(deviceTypeId),
  ]);

  if (!term || !supplierDevices) {
    return undefined;
  }

  const searchQueryString = getSearchQueryString(req.query);
  const breadcrumbs: Breadcrumb[] = [
    { href: "/", text: "Home" },
    searchQueryString
      ? { href: `/search-results${searchQueryString}`, text: "Search results" }
      : { href: "/search", text: "Search" },
  ];

  return {
    breadcrumbs,
    // Products are linked by their search path, so they lead back to the search
    devices: withProductHrefs(
      supplierDevices.devices,
      `/supplier/${String(supplierId)}`,
      searchQueryString,
    ),
    deviceTypeId,
    deviceTypePath:
      browsePath &&
      `/category/${String(browsePath.categoryId)}/device-type/${String(deviceTypeId)}`,
    gmdnTerm: term.gmdnTermName,
    supplier: supplierDevices.supplier,
  };
};

const renderSupplierPage = async (
  res: Response,
  supplierPage:
    | Awaited<ReturnType<typeof getSupplierInCategory>>
    | Awaited<ReturnType<typeof getSupplierInSearch>>,
) => {
  if (!supplierPage) {
    res.status(404).render("not-found");
    return;
  }

  const trustData = await getDeviceTypeTrustData(
    supplierPage.deviceTypeId,
    supplierPage.supplier.manufacturerId,
  );

  res.render("device-type/supplier", { ...supplierPage, trustData });
};

export const renderDeviceTypeSupplier = async (req: Request, res: Response) => {
  await renderSupplierPage(res, await getSupplierInCategory(req));
};

export const renderDeviceTypeSupplierFromSearch = async (
  req: Request,
  res: Response,
) => {
  await renderSupplierPage(res, await getSupplierInSearch(req));
};

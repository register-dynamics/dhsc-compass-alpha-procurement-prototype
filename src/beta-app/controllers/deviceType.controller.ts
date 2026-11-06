import { Request, Response } from "express";
import { NoResultError } from "kysely";

import {
  getGmdnTermsBeneathCategory,
  getHierarchyForCategory,
} from "../services/gmdnCategoryService.js";
import {
  getDevicesForSupplierAndDeviceType,
  getSuppliersForDeviceType,
  getSupplierWithId,
} from "../services/supplierService.js";

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
  const suppliers = await getSuppliersForDeviceType(deviceTypeId);

  res.render("device-type", {
    breadcrumbs,
    deviceTypePath,
    gmdnTerm,
    suppliers,
  });
};

// The supplier's devices of this type, for the path in the URL. Returns
// undefined if any part of that path doesn't exist.
export const getSupplierInCategory = async (req: Request) => {
  const deviceType = await getDeviceTypeInCategory(req);

  if (!deviceType) {
    return undefined;
  }

  const { breadcrumbs, deviceTypeId, deviceTypePath, gmdnTerm } = deviceType;
  const supplierId = Number(req.params.supplierId);

  const [supplier, devices] = await Promise.all([
    getSupplierWithId(supplierId),
    getDevicesForSupplierAndDeviceType(deviceTypeId, supplierId),
  ]);

  if (!supplier || devices.length === 0) {
    return undefined;
  }

  return {
    breadcrumbs: [...breadcrumbs, { href: deviceTypePath, text: gmdnTerm }],
    devices,
    deviceTypePath,
    gmdnTerm,
    supplier,
    supplierPath: `${deviceTypePath}/supplier/${String(supplierId)}`,
  };
};

export const renderDeviceTypeSupplier = async (req: Request, res: Response) => {
  const supplierInCategory = await getSupplierInCategory(req);

  if (!supplierInCategory) {
    res.status(404).render("not-found");
    return;
  }

  res.render("device-type/supplier", supplierInCategory);
};

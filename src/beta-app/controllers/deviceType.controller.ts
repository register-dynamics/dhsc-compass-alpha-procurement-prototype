import { Request, Response } from "express";

import { getGmdnTermNameByTermCode } from "../services/gmdnCategoryService.js";
import {
  getDevicesForSupplierAndDeviceType,
  getSuppliersForDeviceType,
  getSupplierWithId,
} from "../services/supplierService.js";

export const renderDeviceType = async (req: Request, res: Response) => {
  const deviceTypeId = Number(req.params.deviceTypeId);

  const [gmdnTerm, suppliers] = await Promise.all([
    getGmdnTermNameByTermCode(deviceTypeId),
    getSuppliersForDeviceType(deviceTypeId),
  ]);

  res.render("device-type", { deviceTypeId, gmdnTerm, suppliers });
};

export const renderDeviceTypeSupplier = async (req: Request, res: Response) => {
  const deviceTypeId = Number(req.params.deviceTypeId);
  const supplierId = Number(req.params.supplierId);

  const [gmdnTerm, supplier, devices] = await Promise.all([
    getGmdnTermNameByTermCode(deviceTypeId),
    getSupplierWithId(supplierId),
    getDevicesForSupplierAndDeviceType(deviceTypeId, supplierId),
  ]);

  if (!supplier || devices.length === 0) {
    res.status(404).render("not-found");
    return;
  }

  res.render("device-type/supplier", {
    devices,
    deviceTypeId,
    gmdnTerm,
    supplier,
  });
};

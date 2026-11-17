import { Router } from "express";

import {
  renderDeviceType,
  renderDeviceTypeRelatedTrusts,
  renderDeviceTypeSupplier,
  renderDeviceTypeSupplierFromSearch,
  renderDeviceTypeSupplierRelatedTrusts,
  renderDeviceTypeSupplierRelatedTrustsFromSearch,
  renderDeviceTypeSupplierTrusts,
  renderDeviceTypeSupplierTrustsFromSearch,
  renderDeviceTypeTrusts,
} from "../controllers/deviceType.controller.js";
import { registerRoutes, type RouteDefinition } from "./route-definitions.js";

const router = Router();

const categorySupplierPath =
  "/category/:categoryId/device-type/:deviceTypeId/supplier/:supplierId";
const searchSupplierPath = "/device-type/:deviceTypeId/supplier/:supplierId";

const routeDefinitions: RouteDefinition[] = [
  {
    handler: renderDeviceType,
    method: "get",
    path: "/category/:categoryId/device-type/:deviceTypeId",
  },
  {
    handler: renderDeviceTypeTrusts,
    method: "get",
    path: "/category/:categoryId/device-type/:deviceTypeId/trusts",
  },
  {
    handler: renderDeviceTypeRelatedTrusts,
    method: "get",
    path: "/category/:categoryId/device-type/:deviceTypeId/related-trusts",
  },
  {
    // Device type x supplier from GMDN category browse
    handler: renderDeviceTypeSupplier,
    method: "get",
    path: categorySupplierPath,
  },
  {
    handler: renderDeviceTypeSupplierTrusts,
    method: "get",
    path: `${categorySupplierPath}/trusts`,
  },
  {
    handler: renderDeviceTypeSupplierRelatedTrusts,
    method: "get",
    path: `${categorySupplierPath}/related-trusts`,
  },
  {
    // Device type x supplier from search
    handler: renderDeviceTypeSupplierFromSearch,
    method: "get",
    path: searchSupplierPath,
  },
  {
    handler: renderDeviceTypeSupplierTrustsFromSearch,
    method: "get",
    path: `${searchSupplierPath}/trusts`,
  },
  {
    handler: renderDeviceTypeSupplierRelatedTrustsFromSearch,
    method: "get",
    path: `${searchSupplierPath}/related-trusts`,
  },
];

registerRoutes(router, routeDefinitions);

export { routeDefinitions as deviceTypeRouteDefinitions };

export default router;

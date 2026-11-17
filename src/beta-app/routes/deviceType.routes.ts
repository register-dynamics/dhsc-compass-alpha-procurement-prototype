import { Router } from "express";

import {
  renderDeviceType,
  renderDeviceTypeRelatedTrusts,
  renderDeviceTypeSupplier,
  renderDeviceTypeSupplierFromSearch,
  renderDeviceTypeTrusts,
} from "../controllers/deviceType.controller.js";
import { registerRoutes, type RouteDefinition } from "./route-definitions.js";

const router = Router();

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
    path: "/category/:categoryId/device-type/:deviceTypeId/supplier/:supplierId",
  },
  {
    // Device type x supplier from search
    handler: renderDeviceTypeSupplierFromSearch,
    method: "get",
    path: "/device-type/:deviceTypeId/supplier/:supplierId",
  },
];

registerRoutes(router, routeDefinitions);

export { routeDefinitions as deviceTypeRouteDefinitions };

export default router;

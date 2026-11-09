import { Router } from "express";

import {
  renderDeviceType,
  renderDeviceTypeSupplier,
} from "../controllers/deviceType.controller.js";
import { registerRoutes, type RouteDefinition } from "./route-definitions.js";

const router = Router();

const routeDefinitions: RouteDefinition[] = [
  {
    handler: renderDeviceType,
    method: "get",
    path: "/device-type/:deviceTypeId",
  },
  {
    handler: renderDeviceTypeSupplier,
    method: "get",
    path: "/device-type/:deviceTypeId/supplier/:supplierId",
  },
];

registerRoutes(router, routeDefinitions);

export { routeDefinitions as deviceTypeRouteDefinitions };

export default router;

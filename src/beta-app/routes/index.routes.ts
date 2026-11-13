import { Router } from "express";

import {
  renderDashboard,
  renderHelp,
  renderIndex,
} from "../controllers/index.controller.js";
import { registerRoutes, type RouteDefinition } from "./route-definitions.js";

const router = Router();

const routeDefinitions: RouteDefinition[] = [
  {
    auth: false,
    handler: renderIndex,
    method: "get",
    path: "/",
  },
  {
    handler: renderDashboard,
    method: "get",
    path: "/dashboard",
  },
  {
    auth: false,
    handler: renderHelp,
    method: "get",
    path: "/help",
  },
];

registerRoutes(router, routeDefinitions);

export { routeDefinitions as indexRouteDefinitions };

export default router;

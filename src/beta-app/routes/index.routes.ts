import { Router } from "express";

import { renderIndex } from "../controllers/index.controller.js";
import { registerRoutes, type RouteDefinition } from "./route-definitions.js";

const router = Router();

const routeDefinitions: RouteDefinition[] = [
  {
    auth: false,
    handler: renderIndex,
    method: "get",
    path: "/",
  },
];

registerRoutes(router, routeDefinitions);

export { routeDefinitions as indexRouteDefinitions };

export default router;

import { Router } from "express";

import {
  renderSearch,
  renderSearchResults,
} from "../controllers/search.controller.js";
import { registerRoutes, type RouteDefinition } from "./route-definitions.js";

const router = Router();

const routeDefinitions: RouteDefinition[] = [
  {
    handler: renderSearch,
    method: "get",
    path: "/search",
  },
  {
    handler: renderSearchResults,
    method: "get",
    path: "/search-results",
  },
];

registerRoutes(router, routeDefinitions);

export { routeDefinitions as searchRouteDefinitions };

export default router;

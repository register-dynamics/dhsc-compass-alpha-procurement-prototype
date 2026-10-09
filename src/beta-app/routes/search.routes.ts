import { Router } from "express";

import {
  renderCategories,
  renderCategory,
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
  {
    handler: renderCategories,
    method: "get",
    path: "/categories"
  },
  {
    handler: renderCategory,
    method: "get",
    path: "/category/:categoryId"
  }
];

registerRoutes(router, routeDefinitions);

export { routeDefinitions as searchRouteDefinitions };

export default router;

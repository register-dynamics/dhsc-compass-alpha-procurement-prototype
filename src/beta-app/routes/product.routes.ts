import { Router } from "express";

import { renderProduct } from "../controllers/product.controller.js";
import { registerRoutes, type RouteDefinition } from "./route-definitions.js";

const router = Router();

const routeDefinitions: RouteDefinition[] = [
  {
    handler: renderProduct,
    method: "get",
    path: "/product/:id",
  },
];

registerRoutes(router, routeDefinitions);

export { routeDefinitions as productRouteDefinitions };

export default router;

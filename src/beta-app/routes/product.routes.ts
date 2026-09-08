import { Router } from "express";

import { postMarkUseful, renderProduct } from "../controllers/product.controller.js";
import { registerRoutes, type RouteDefinition } from "./route-definitions.js";

const router = Router();

const routeDefinitions: RouteDefinition[] = [
  {
    handler: renderProduct,
    method: "get",
    path: "/product/:id",
  },
  {
    handler: postMarkUseful,
    method: "post",
    path: "/product/mark-useful",
  },];

registerRoutes(router, routeDefinitions);

export { routeDefinitions as productRouteDefinitions };

export default router;

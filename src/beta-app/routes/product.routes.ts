import { Router } from "express";

import {
  postMarkUseful,
  postUnmarkUseful,
  renderProduct,
  renderProductInCategory,
  renderProductRelatedTrusts,
  renderProductTrusts,
  renderProductTrustsInCategory,
} from "../controllers/product.controller.js";
import { registerRoutes, type RouteDefinition } from "./route-definitions.js";

const router = Router();

const categoryProductPath =
  "/category/:categoryId/device-type/:deviceTypeId/supplier/:supplierId/product/:aggregationName";

const routeDefinitions: RouteDefinition[] = [
  {
    handler: renderProduct,
    method: "get",
    path: "/product/:aggregationName",
  },
  {
    handler: renderProductInCategory,
    method: "get",
    path: categoryProductPath,
  },
  {
    handler: renderProductTrustsInCategory,
    method: "get",
    path: `${categoryProductPath}/trusts`,
  },
  {
    handler: postMarkUseful,
    method: "post",
    path: "/product/mark-useful",
  },
  {
    handler: postUnmarkUseful,
    method: "post",
    path: "/product/unmark-useful",
  },
  // {
  //   handler: renderAddEvidence,
  //   method: "get",
  //   path: "/product/:productId/add-evidence",
  // },
  // {
  //   handler: postAddEvidence,
  //   method: "post",
  //   path: "/product/:productId/add-evidence",
  // },
  // {
  //   handler: renderAddEvidenceContactSelf,
  //   method: "get",
  //   path: "/product/:productId/evidence/add-evidence-contact-self",
  // },
  // {
  //   handler: postAddEvidenceContactSelf,
  //   method: "post",
  //   path: "/product/:productId/evidence/add-evidence-contact-self",
  // },
  {
    handler: renderProductTrusts,
    method: "get",
    path: "/product/:aggregationName/trusts",
  },
  {
    handler: renderProductRelatedTrusts,
    method: "get",
    path: "/product/:productId/related-trusts",
  },
];

registerRoutes(router, routeDefinitions);

export { routeDefinitions as productRouteDefinitions };

export default router;

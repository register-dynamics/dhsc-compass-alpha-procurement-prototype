import { Router } from "express";

import {
  postMarkUseful,
  postUnmarkUseful,
  renderProduct,
  renderProductInCategory,
  renderProductRelatedContract,
  renderProductRelatedContractInCategory,
  renderProductRelatedTrusts,
  renderProductRelatedTrustsInCategory,
  renderProductTrustExperience,
  renderProductTrustExperienceInCategory,
  renderProductTrusts,
  renderProductTrustsInCategory,
} from "../controllers/product.controller.js";
import { registerRoutes, type RouteDefinition } from "./route-definitions.js";

const router = Router();

// An aggregation is identified by its name and supplier, as different
// suppliers can use the same aggregation name for unrelated products. It can
// span several device types, so the page is for its products of one type.
const searchProductPath =
  "/device-type/:deviceTypeId/supplier/:supplierId/product/:aggregationName";
const categoryProductPath = `/category/:categoryId${searchProductPath}`;

const routeDefinitions: RouteDefinition[] = [
  {
    handler: renderProduct,
    method: "get",
    path: searchProductPath,
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
    handler: renderProductRelatedTrustsInCategory,
    method: "get",
    path: `${categoryProductPath}/related-trusts`,
  },
  {
    handler: renderProductRelatedContractInCategory,
    method: "get",
    path: `${categoryProductPath}/related-trusts/contract/:contractId`,
  },
  {
    handler: renderProductTrustExperienceInCategory,
    method: "get",
    path: `${categoryProductPath}/trust/:trustId`,
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
  {
    handler: renderProductTrusts,
    method: "get",
    path: `${searchProductPath}/trusts`,
  },
  {
    handler: renderProductRelatedTrusts,
    method: "get",
    path: `${searchProductPath}/related-trusts`,
  },
  {
    handler: renderProductRelatedContract,
    method: "get",
    path: `${searchProductPath}/related-trusts/contract/:contractId`,
  },
  {
    handler: renderProductTrustExperience,
    method: "get",
    path: `${searchProductPath}/trust/:trustId`,
  },
];

registerRoutes(router, routeDefinitions);

export { routeDefinitions as productRouteDefinitions };

export default router;

import { Router } from "express";

import {
  postAddEvidence,
  postAddEvidenceContactSelf,
  postMarkUseful,
  postUnmarkUseful,
  renderAddEvidence,
  renderAddEvidenceContactSelf,
  renderProduct,
  renderProductRelatedTrusts,
  renderProductSpecifications,
  renderProductTrusts,
} from "../controllers/product.controller.js";
import { registerRoutes, type RouteDefinition } from "./route-definitions.js";

const router = Router();

const routeDefinitions: RouteDefinition[] = [
  {
    handler: renderProduct,
    method: "get",
    path: "/product/:aggregationName",
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
    handler: renderAddEvidence,
    method: "get",
    path: "/product/:productId/add-evidence",
  },
  {
    handler: postAddEvidence,
    method: "post",
    path: "/product/:productId/add-evidence",
  },
  // {
  //   handler: renderAddEvidenceContactExperience,
  //   method: "get",
  //   path: "/product/:productId/evidence/:evidenceId/add-contact-experience",
  // },
  // {
  //   handler: renderAddEvidenceContactAcquisition,
  //   method: "get",
  //   path: "/product/:productId/evidence/:evidenceId/add-contact-acquisition",
  // },
  // {
  //   handler: renderAddEvidenceContactDocument,
  //   method: "get",
  //   path: "/product/:productId/evidence/:evidenceId/add-contact-document",
  // },
  // {
  //   handler: postAddEvidenceContactDone,
  //   method: "post",
  //   path: "/product/:productId/evidence/:evidenceId/add-contact-done",
  // },
  {
    handler: renderAddEvidenceContactSelf,
    method: "get",
    path: "/product/:productId/evidence/add-evidence-contact-self",
  },
  {
    handler: postAddEvidenceContactSelf,
    method: "post",
    path: "/product/:productId/evidence/add-evidence-contact-self",
  },
  {
    handler: renderProductSpecifications,
    method: "get",
    path: "/product/:productId/specifications",
  },
  {
    handler: renderProductTrusts,
    method: "get",
    path: "/product/:productId/trusts",
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

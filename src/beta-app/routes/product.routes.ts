import { Router } from "express";

import {
  postAddEvidence,
  postAddEvidenceContact,
  postAddEvidenceContactSelf,
  postMarkUseful,
  postUnmarkUseful,
  renderAddEvidence,
  renderAddEvidenceContact,
  renderAddEvidenceContactSelf,
  renderProduct,
} from "../controllers/product.controller.js";
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
  },
  {
    handler: postUnmarkUseful,
    method: "post",
    path: "/product/unmark-useful",
  },
  {
    handler: renderAddEvidence,
    method: "get",
    path: "/product/:id/add-evidence",
  },
  {
    handler: postAddEvidence,
    method: "post",
    path: "/product/:id/add-evidence",
  },
  {
    handler: renderAddEvidenceContactSelf,
    method: "get",
    path: "/product/:productId/add-evidence-contact-self",
  },
  {
    handler: postAddEvidenceContactSelf,
    method: "post",
    path: "/product/:productId/add-evidence-contact-self",
  },
  {
    handler: renderAddEvidenceContact,
    method: "get",
    path: "/product/:productId/evidence/:evidenceId/add-contact",
  },
  {
    handler: postAddEvidenceContact,
    method: "post",
    path: "/product/:productId/evidence/:evidenceId/add-contact",
  },
];

registerRoutes(router, routeDefinitions);

export { routeDefinitions as productRouteDefinitions };

export default router;

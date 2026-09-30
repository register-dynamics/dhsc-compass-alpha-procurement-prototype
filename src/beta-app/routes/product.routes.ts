import { Router } from "express";

import {
  postAddEvidence,
  postAddEvidenceContactDone,
  postAddEvidenceContactSelf,
  postMarkUseful,
  postUnmarkUseful,
  renderAddEvidence,
  renderAddEvidenceContactAcquisition,
  renderAddEvidenceContactDocument,
  renderAddEvidenceContactExperience,
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
    path: "/product/:productId/add-evidence",
  },
  {
    handler: postAddEvidence,
    method: "post",
    path: "/product/:productId/add-evidence",
  },
  {
    handler: renderAddEvidenceContactExperience,
    method: "get",
    path: "/product/:productId/evidence/:evidenceId/add-contact-experience",
  },
  {
    handler: renderAddEvidenceContactAcquisition,
    method: "get",
    path: "/product/:productId/evidence/:evidenceId/add-contact-acquisition",
  },
  {
    handler: renderAddEvidenceContactDocument,
    method: "get",
    path: "/product/:productId/evidence/:evidenceId/add-contact-document",
  },
  {
    handler: postAddEvidenceContactDone,
    method: "post",
    path: "/product/:productId/evidence/:evidenceId/add-contact-done",
  },
  {
    handler: renderAddEvidenceContactSelf,
    method: "get",
    path: "/product/:productId/evidence/add-evidence-contact-self",
  },
  {
    handler: postAddEvidenceContactSelf,
    method: "post",
    path: "/product/:productId/evidence/add-evidence-contact-self",
  }
];

registerRoutes(router, routeDefinitions);

export { routeDefinitions as productRouteDefinitions };

export default router;

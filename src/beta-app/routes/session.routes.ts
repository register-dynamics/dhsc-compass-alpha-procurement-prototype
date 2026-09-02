import { Router } from "express";

import {
  postSignIn,
  renderSignIn,
  signOut,
} from "../controllers/session.controller.js";
import { registerRoutes, type RouteDefinition } from "./route-definitions.js";

const router = Router();

const routeDefinitions: RouteDefinition[] = [
  {
    auth: false,
    handler: renderSignIn,
    method: "get",
    path: "/sign-in",
  },
  {
    auth: false,
    handler: postSignIn,
    method: "post",
    path: "/sign-in",
  },
  {
    auth: false,
    handler: signOut,
    method: "get",
    path: "/sign-out",
  },
];

registerRoutes(router, routeDefinitions);

export { routeDefinitions as sessionRouteDefinitions };

export default router;

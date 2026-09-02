import type { Request, RequestHandler, Router } from "express";

export interface RouteDefinition {
  auth?: boolean;
  handler: RequestHandler;
  method: RouteMethod;
  path: string;
}

type RouteMethod = "delete" | "get" | "patch" | "post" | "put";

const buildRouteKey = (method: string, path: string) => {
  return `${method.toUpperCase()} ${path}`;
};

export const registerRoutes = (
  router: Router,
  definitions: RouteDefinition[],
) => {
  for (const definition of definitions) {
    router[definition.method](definition.path, definition.handler);
  }
};

export const buildPublicRouteMatcher = (definitions: RouteDefinition[]) => {
  const publicRouteKeys = new Set(
    definitions
      .filter((definition) => definition.auth === false)
      .map((definition) => buildRouteKey(definition.method, definition.path)),
  );

  return (req: Pick<Request, "method" | "path">) => {
    return publicRouteKeys.has(buildRouteKey(req.method, req.path));
  };
};

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

export const buildRouteMatcher = (
  definitions: RouteDefinition[],
): ((req: Pick<Request, "method" | "path">) => boolean) => {
  return (req: Pick<Request, "method" | "path">) =>
    definitions.some((definition) => {
      if (definition.method.toUpperCase() !== req.method.toUpperCase()) {
        return false;
      }

      const pathPattern =
        definition.path === "/"
          ? "/"
          : definition.path
              .split("/")
              .map((segment) =>
                segment.startsWith(":")
                  ? "[^/]+"
                  : segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
              )
              .join("/");

      return new RegExp(`^${pathPattern}/?$`).test(req.path);
    });
};

export const registerRoutes = (
  router: Router,
  definitions: RouteDefinition[],
) => {
  for (const definition of definitions) {
    router[definition.method](definition.path, definition.handler);
  }
};

export const buildPublicRouteMatcher = (
  definitions: RouteDefinition[],
): ((req: Pick<Request, "method" | "path">) => boolean) => {
  return buildRouteMatcher(
    definitions.filter((definition) => definition.auth === false),
  );
};

export { buildRouteKey };

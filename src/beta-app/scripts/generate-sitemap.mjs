// Script to generate a sitemap for pa11y to use when testing the accessibility of the app
import fs from "node:fs";
import app from "../dist/app.js";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3001";
const pa11yciFile = ".pa11yci";

// Values used to populate dynamic route segments, keyed by param name.
// Any route containing e.g. ":supplierId" will have it replaced with the value here.
// These must form a valid chain (category -> device type -> supplier -> product)
// so that the nested routes resolve to real pages.
const paramValues = {
  categoryId: "10027",
  deviceTypeId: "14035",
  supplierId: "65283",
  aggregationName: "Thermometer tympanic device",
};

// Routes whose populated URL should differ from the default param substitution,
// e.g. to add a query string or use a different value for a top-level page
const routeOverrides = {
  "/search-results": "/search-results?q=glucose",
  "/category/:categoryId": "/category/4941",
};

// Routes that shouldn't be tested in the main run (sign-out ends the session,
// so it is tested last instead, after all authenticated pages)
const deferredRoutes = ["/sign-out"];

const signInUrlTest = {
  __NOTE:
    "This should always be FIRST (to test the sign in page before actually signing in)",
  url: `${BASE_URL}/sign-in`,
};

const initialSignInUrl = {
  __NOTE:
    "This should always be SECOND (if browser context is preserved) to authenticate the user",
  url: `${BASE_URL}/sign-in`,
  actions: [
    `navigate to ${BASE_URL}/sign-in`,
    "wait for element .nhsuk-width-container to be visible",
    "set field #username to test@example.com",
    "set field #password to northsouth",
    "click element .nhsuk-button",
    "wait for path to be /dashboard",
  ],
};

// URLs that should be tested that the router doesn't find e.g. 404 and 500 handlers
const additionalUrlsToTest = [`${BASE_URL}/not-found`, `${BASE_URL}/error`];

// Extract the mounted path from an Express layer's regular expression
function getMountedPath(layer) {
  const source = layer?.regexp?.source ?? "";

  if (!source) {
    return "";
  }

  const match = source.match(/^\\\/([^\\^]+?)\\\/\?\(\?=\\\/\|\$\)/);

  if (match) {
    return `/${match[1]}`;
  }

  return "";
}

// Recursively get all GET routes from an Express router, including nested routers
// Ignores non-GET routes and routes without a defined path (e.g. POST routes)
function getRoutes(router, prefix = "") {
  const stack =
    router?.router?.stack ?? router?._router?.stack ?? router?.stack ?? [];
  const routes = [];

  for (const layer of stack) {
    if (layer.route) {
      const routePath = layer.route.path;

      if (layer.route.methods?.get && routePath) {
        routes.push(`${prefix}${routePath}`);
      }

      continue;
    }

    const childRouter = layer?.handle;

    if (
      childRouter &&
      (layer?.name === "router" || layer?.name === "bound dispatch") &&
      (childRouter.stack ||
        childRouter._router?.stack ||
        childRouter.router?.stack)
    ) {
      routes.push(
        ...getRoutes(childRouter, `${prefix}${getMountedPath(layer)}`),
      );
    }
  }

  return routes;
}

// Replace dynamic segments (e.g. ":supplierId") with actual values,
// applying any route-specific overrides first
function populateRoute(route) {
  if (routeOverrides[route]) {
    return routeOverrides[route];
  }

  return route.replace(/:(\w+)/g, (segment, name) => {
    if (!(name in paramValues)) {
      throw new Error(
        `No value defined for route param "${segment}" in "${route}". Add it to paramValues in generate-sitemap.mjs`,
      );
    }
    return encodeURIComponent(paramValues[name]);
  });
}

// Get all route patterns from the app (deduplicated, as GET and HEAD etc. may repeat)
const routes = [...new Set(getRoutes(app))];

// Populate routes with real values
// e.g. "/search-results" becomes "/search-results?q=glucose"
// and "/supplier/:supplierId" becomes "/supplier/65283"
const urls = routes
  .filter((route) => !deferredRoutes.includes(route))
  .map((route) => `${BASE_URL}${populateRoute(route)}`)
  .sort();

// Add the initial login URL to the start of the list of URLs
// Needed to authenticate the user before accessing other routes
urls.unshift(signInUrlTest, initialSignInUrl);

urls.push(...additionalUrlsToTest);

// Test routes that end the session last
urls.push(
  ...routes
    .filter((route) => deferredRoutes.includes(route))
    .map((route) => `${BASE_URL}${populateRoute(route)}`),
);

// Write the updated list of URLs to the pa11yci configuration file
if (fs.existsSync(pa11yciFile)) {
  const pa11yciConfig = JSON.parse(fs.readFileSync(pa11yciFile, "utf-8"));
  pa11yciConfig.urls = urls;
  fs.writeFileSync(pa11yciFile, JSON.stringify(pa11yciConfig, null, 2));
} else {
  fs.writeFileSync(pa11yciFile, JSON.stringify({ urls }, null, 2));
}

console.log(`Found ${urls.length} routes`);
console.log(`Wrote ${pa11yciFile}`);

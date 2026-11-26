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
  // University Hospitals Birmingham, which has evidence for the product
  trustId: "6",
  // Thermometers & Probe Covers, in the same or related categories as the
  // device type
  contractId: "FAKE0018",
};

// Extra values to test a route with as well, keyed by param name, for pages
// laid out differently depending on the data
const extraParamValues = {
  // Waymeet, which has a contract for the product but no evidence
  trustId: ["13"],
};

// Routes whose populated URL should differ from the default param substitution,
// e.g. to add a query string or use a different value for a top-level page
const routeOverrides = {
  "/search-results": "/search-results?q=glucose",
  "/category/:categoryId": "/category/4941",
  // The thermometer's supplier has no contracts in the same or related
  // categories, so its contract pages use Aorta Solutions' heart rate
  // monitor instead, with Blood Pressure Monitoring Equipment
  "/category/:categoryId/device-type/:deviceTypeId/supplier/:supplierId/related-trusts/contract/:contractId":
    "/category/9990/device-type/35198/supplier/13455/related-trusts/contract/FAKE0019",
  "/device-type/:deviceTypeId/supplier/:supplierId/related-trusts/contract/:contractId":
    "/device-type/35198/supplier/13455/related-trusts/contract/FAKE0019",
  "/category/:categoryId/device-type/:deviceTypeId/supplier/:supplierId/product/:aggregationName/related-trusts/contract/:contractId":
    "/category/9990/device-type/35198/supplier/13455/product/Heart%20Rate%20Monitor/related-trusts/contract/FAKE0019",
  "/device-type/:deviceTypeId/supplier/:supplierId/product/:aggregationName/related-trusts/contract/:contractId":
    "/device-type/35198/supplier/13455/product/Heart%20Rate%20Monitor/related-trusts/contract/FAKE0019",
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
function populateRoute(route, values = paramValues) {
  if (routeOverrides[route]) {
    return routeOverrides[route];
  }

  return route.replace(/:(\w+)/g, (segment, name) => {
    if (!(name in values)) {
      throw new Error(
        `No value defined for route param "${segment}" in "${route}". Add it to paramValues in generate-sitemap.mjs`,
      );
    }
    return encodeURIComponent(values[name]);
  });
}

// The route populated with paramValues, then once for each of its extra values
function populateRouteVariants(route) {
  const variants = [populateRoute(route)];

  for (const [name, values] of Object.entries(extraParamValues)) {
    if (route.includes(`:${name}`)) {
      for (const value of values) {
        variants.push(populateRoute(route, { ...paramValues, [name]: value }));
      }
    }
  }

  return variants;
}

// Get all route patterns from the app (deduplicated, as GET and HEAD etc. may repeat)
const routes = [...new Set(getRoutes(app))];

// Populate routes with real values
// e.g. "/search-results" becomes "/search-results?q=glucose"
// and "/supplier/:supplierId" becomes "/supplier/65283"
const urls = routes
  .filter((route) => !deferredRoutes.includes(route))
  .flatMap(populateRouteVariants)
  .map((url) => `${BASE_URL}${url}`)
  .sort(); // NOSONAR

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
  fs.writeFileSync(pa11yciFile, `${JSON.stringify(pa11yciConfig, null, 2)}\n`);
} else {
  fs.writeFileSync(pa11yciFile, `${JSON.stringify({ urls }, null, 2)}\n`);
}

console.log(`Found ${urls.length} routes`);
console.log(`Wrote ${pa11yciFile}`);

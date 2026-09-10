// Script to generate a sitemap for pa11y to use when testing the accessibility of the app
import fs from "node:fs";
import app from "../dist/app.js";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3001";
const pa11yciFile = ".pa11yci";

// Define routes that require query parameters or dynamic segments to be replaced with actual values
const routesNeedingParams = [
    {
        path: "/search-results",
        replace: "/search-results",
        with: "/search-results?q=glucose"
    },
    {
        path: "/product/:id",
        replace: "/product/:id",
        with: "/product/14236541"
    }
];

const initialLoginUrl = {
    "__NOTE": "this should always be FIRST (if browser context is preserved)",
    "url": `${BASE_URL}/sign-in`,
    "actions": [
        `navigate to ${BASE_URL}/sign-in`,
        "wait for element .nhsuk-width-container to be visible",
        "set field #username to test@example.com",
        "set field #password to northsouth",
        "click element .nhsuk-button",
        "wait for element .nice-hero to be visible"
    ]
}

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

// Replace routes that require query parameters or dynamic segments with actual values
function replaceRoutesNeedingParams(routes) {
    return routes.flatMap((route) => {
        const replacement = routesNeedingParams.find((r) => r.path === route);
        if (replacement) {
            return replacement.with;
        }
        return route;
    });
}

// Get all route patterns from the app
const routes = getRoutes(app);

// Replace routes that need query parameters with their corresponding URLs
// e.g. "/search-results" becomes "/search-results?q=glucose"
// and "/product/:id" becomes "/product/14236541"
const finalRoutes = replaceRoutesNeedingParams(routes);

const urls = finalRoutes.map((route) => `${BASE_URL}${route}`).sort();

// Add the initial login URL to the start of the list of URLs
// Needed to authenticate the user before accessing other routes
urls.unshift(initialLoginUrl);

// Write the updated list of URLs to the pa11yci configuration file
if (fs.existsSync(pa11yciFile)) {
    const pa11yciConfig = JSON.parse(fs.readFileSync(pa11yciFile, "utf-8"));
    pa11yciConfig.urls = urls;
    fs.writeFileSync(pa11yciFile, JSON.stringify(pa11yciConfig, null, 2));
}
else {
    fs.writeFileSync(pa11yciFile, JSON.stringify({ urls }, null, 2));
}

console.log(`Found ${urls.length} routes`);
console.log(`Wrote ${pa11yciFile}`);

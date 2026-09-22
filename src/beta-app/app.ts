import bodyParser from "body-parser";
import express, { type ErrorRequestHandler } from "express";
import pgConnect from "connect-pg-simple";
import session from "express-session";
import nunjucks from "nunjucks";

import config from "./config.js";
import { pgPool } from "./database/client.js";
import { ensureAuthenticated, initializeAuth } from "./middleware/auth.js";
import indexRoutes, { indexRouteDefinitions } from "./routes/index.routes.js";
import productRoutes, {
  productRouteDefinitions,
} from "./routes/product.routes.js";
import {
  buildPublicRouteMatcher,
  buildRouteMatcher,
} from "./routes/route-definitions.js";
import searchRoutes, {
  searchRouteDefinitions,
} from "./routes/search.routes.js";
import sessionRoutes, {
  sessionRouteDefinitions,
} from "./routes/session.routes.js";

const app = express();

// Parse URL-encoded bodies (as sent by HTML forms) - used by passport for login form submission
app.use(bodyParser.urlencoded({ extended: false }));

// Parse JSON bodies (as sent by API clients)
app.use(bodyParser.json());

// Configure session and authentication middleware
const sessionStore = new (pgConnect(session))({
  createTableIfMissing: true,
  pool: pgPool,
  tableName: "user_sessions",
}) as session.Store;

const sessionOptions: session.SessionOptions = {
  cookie: {
    httpOnly: config.session.cookie.httpOnly,
    maxAge: config.session.cookie.maxAgeMs,
    sameSite: config.session.cookie.sameSite,
    secure: config.env === "production",
  },
  resave: false,
  saveUninitialized: true,
  secret: config.session.secret,
  store: sessionStore,
};

app.use(session(sessionOptions));
initializeAuth(app);

// Set up Nunjucks templating engine with NHS Design System
const nunjucksEnv = nunjucks.configure(
  [
    "node_modules/nhsuk-frontend/dist/nhsuk/components",
    "node_modules/nhsuk-frontend/dist/nhsuk/macros",
    "node_modules/nhsuk-frontend/dist/nhsuk",
    "node_modules/nhsuk-frontend/dist",
    "views",
  ],
  {
    autoescape: true,
    express: app,
  },
);

// TODO: Remove this and put it in a better middleware place
app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  next();
});

nunjucksEnv.addGlobal("serviceName", config.app.name);

app.set("view engine", "html");

app.use(express.json());

// Serve static files from the public directory
const publicDir = new URL("./public", import.meta.url).pathname;
app.use(express.static(publicDir));

// Hook-in to node_modules to serve the NHS Design System assets at /assets
app.use(
  "/assets",
  express.static("node_modules/nhsuk-frontend/dist/nhsuk/assets"),
);

// Define routes for the application
const routeModules = [
  {
    definitions: indexRouteDefinitions,
    mountPath: "/",
    router: indexRoutes,
  },
  {
    definitions: searchRouteDefinitions,
    mountPath: "/",
    router: searchRoutes,
  },
  {
    definitions: sessionRouteDefinitions,
    mountPath: "/",
    router: sessionRoutes,
  },
  {
    definitions: productRouteDefinitions,
    mountPath: "/",
    router: productRoutes,
  },
];

const isPublicRoute = buildPublicRouteMatcher(
  routeModules.flatMap(({ definitions }) => definitions),
);
const isKnownRoute = buildRouteMatcher(
  routeModules.flatMap(({ definitions }) => definitions),
);

// TODO: Put this middleware in a better place
// Middleware to determine if the current route is public and should bypass authentication
app.use((req, res, next) => {
  if (!isKnownRoute(req) || isPublicRoute(req)) {
    next();
    return;
  }

  ensureAuthenticated(req, res, next);
});

// Register routes
for (const { mountPath, router } of routeModules) {
  app.use(mountPath, router);
}

// Handle requests that do not match any registered route.
// This must be registered after all application routes.
app.use((req, res) => {
  res.status(404).render("not-found");
});

// Handle errors passed to next() and errors thrown by async route handlers.
// Keep the error details out of the response so that internal information is not exposed to users.
const globalErrorHandler: ErrorRequestHandler = (error, req, res, next) => {
  console.error("Unhandled application error", error);

  if (res.headersSent) {
    next(error);
    return;
  }

  res.status(500).render("error");
};

app.use(globalErrorHandler);

export default app;

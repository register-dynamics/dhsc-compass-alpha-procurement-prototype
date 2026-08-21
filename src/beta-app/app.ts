import bodyParser from "body-parser";
import express from "express";
import session from "express-session";
import nunjucks from "nunjucks";

import config from "./config.js";
import { initializeAuth } from "./middleware/auth.js";
import indexRoutes from "./routes/index.routes.js";
import searchRoutes from "./routes/search.routes.js";
import sessionRoutes from "./routes/session.routes.js";

const app = express();

// Parse URL-encoded bodies (as sent by HTML forms) - used by passport for login form submission
app.use(bodyParser.urlencoded({ extended: false }));

// Configure session and authentication middleware
const sessionOptions: session.SessionOptions = {
  cookie: { secure: config.env === "production" },
  resave: false,
  saveUninitialized: true,
  secret: config.session.secret,
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

// Register routes
app.use("/", indexRoutes);
app.use("/", searchRoutes);
app.use("/", sessionRoutes);

export default app;

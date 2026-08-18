import express from "express";
import nunjucks from "nunjucks";

import config from "./config.js";

const app = express();

// Set up Nunjucks templating engine with NHS Design System
nunjucks.configure(
  [
    "node_modules/nhsuk-frontend/dist/nhsuk/components",
    "node_modules/nhsuk-frontend/dist/nhsuk/macros",
    "node_modules/nhsuk-frontend/dist/nhsuk",
    "node_modules/nhsuk-frontend/dist",
    "views"
  ],
  {
    autoescape: true,
    express: app,
  },
);

app.set("view engine", "html");

app.use(express.json());

// Serve static files from the public directory§
const publicDir = new URL("./public", import.meta.url).pathname;
app.use(express.static(publicDir));

app.get("/", (req, res) => {
  res.render("index.html", { appName: config.app.name });
});

export default app;

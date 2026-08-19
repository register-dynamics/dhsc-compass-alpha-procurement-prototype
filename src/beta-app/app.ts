import express from "express";
import nunjucks from "nunjucks";

import config from "./config.js";
import { db } from "./database/client.js";

const app = express();

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

// TODO: Add a proper router for the app, this is just a placeholder for now to get some pages going

app.get("/", (req, res) => {
  res.render("index.html");
});

app.get("/search", (req, res) => {
  res.render("search.html");
});

app.get("/search-results", async (req, res) => {
  const searchTerm = typeof req.query.q === "string" ? req.query.q : "";
  const pageSize = config.search.pageSize;
  const currentPage = (parseInt(req.query.page as string) || 1) - 1;
  const searchPage = currentPage + 1;

  // TODO: Category filtering

  const queryParams = {
    limit: pageSize,
    offset: pageSize * currentPage,
    term: searchTerm,
  };

  // Get the total count of search results for the given search term
  const searchResultsCount = await db
    .selectFrom("search")
    .select(db.fn.count<number>("makeId").as("count"))
    .where("search", `match`, searchTerm)
    .executeTakeFirstOrThrow()
    .then((result) => result.count);

  const searchOffset = searchResultsCount > 0 ? currentPage * pageSize + 1 : 0;
  const searchMaxPages =
    Math.trunc(searchResultsCount / pageSize) +
    Math.min(searchResultsCount % pageSize, 1);

  // Get the categories for the filter sidebar, along with the count of results for each category
  const categoriesInSearchResults = await db
    .selectFrom("search")
    .select(["gmdnName", db.fn.count<number>("gmdnName").as("count")])
    .where("search", `match`, searchTerm)
    .groupBy("gmdnName")
    .orderBy("count", "desc")
    .execute()
    .then((results) =>
      results.map((result) => ({ count: result.count, name: result.gmdnName })),
    );

  // Perform the search query with pagination and render the results page
  await db
    .selectFrom("search")
    .selectAll()
    .where("search", `match`, searchTerm)
    .limit(queryParams.limit)
    .offset(queryParams.offset)
    .execute()
    .then((results) => {
      // Add some dummy data to the results for now, until we have a proper database with these fields
      for (const result of results) {
        result.procured = 1;
        result.under_review = 1;
        result.excluded = 1;
      }

      res.render("search-results.html", {
        searchMaxPages,
        searchOffset,
        searchPage,
        searchResultCategories: categoriesInSearchResults,
        searchResults: results,
        searchResultsCount,
        searchTerm,
      });
    });
});

export default app;

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
  const sanitisedSearchTerm = `"${searchTerm}"`;
  const pageSize = config.search.pageSize;
  const currentPage = (parseInt(req.query.page as string) || 1) - 1;
  const searchPage = currentPage + 1;

  const queryCategories = [req.query["[category]"] ?? []]
    .flat()
    .filter((c): c is string => typeof c === "string" && c !== "_unchecked");

  const categoriesQueryString =
    queryCategories.length > 0
      ? `&${queryCategories.map((c) => `[category]=${encodeURIComponent(c)}`).join("&")}`
      : "";

  const queryParams = {
    categories: JSON.stringify(queryCategories),
    limit: pageSize,
    offset: pageSize * currentPage,
    term: sanitisedSearchTerm,
  };

  // Get the total count of search results for the given search term
  let searchResultsCountQuery = db
    .selectFrom("search")
    .select(db.fn.count<number>("makeId").as("count"))
    .where("search", `match`, sanitisedSearchTerm);

  if (queryCategories.length > 0) {
    searchResultsCountQuery = searchResultsCountQuery.where(
      "gmdnName",
      "in",
      queryCategories,
    );
  }

  const searchResultsCount = await searchResultsCountQuery
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
    .where("search", `match`, sanitisedSearchTerm)
    .groupBy("gmdnName")
    .orderBy("count", "desc")
    .execute()
    .then((results) =>
      results.map((result) => ({
        checked: queryCategories.includes(result.gmdnName),
        count: result.count,
        name: result.gmdnName,
      })),
    );

  // Perform the search query with pagination and render the results page
  let results = db
    .selectFrom("search")
    .selectAll()
    .where("search", `match`, sanitisedSearchTerm);

  // Add in the category filter if any categories are selected
  if (queryCategories.length > 0) {
    results = results.where("gmdnName", "in", queryCategories);
  }

  await results
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
        categoriesQueryString,
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

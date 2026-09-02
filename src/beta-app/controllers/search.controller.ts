import { Request, Response } from "express";

import config from "../config.js";
import { db } from "../database/client.js";

export const renderSearch = (req: Request, res: Response) => {
  res.render("search");
};

export const renderSearchResults = async (req: Request, res: Response) => {
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
    .select(db.fn.count<number>("productId").as("count"))
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
};

import { Request, Response } from "express";
import { sql } from "kysely";

import config from "../config.js";
import { db } from "../database/client.js";
import {
  getCategoriesWithParentId,
  getCategoryById,
  getDeviceTypeCountsForCategories,
  getGmdnTermsBeneathCategory,
  getHierarchyForCategory,
  getTopLevelCategories,
} from "../services/gmdnCategoryService.js";
import {
  getCategoriesQueryString,
  getSearchCategories,
  getSearchQueryString,
} from "../services/searchQueryService.js";

export const renderSearch = (req: Request, res: Response) => {
  res.render("search");
};

export const renderSearchResults = async (req: Request, res: Response) => {
  const searchTerm = typeof req.query.q === "string" ? req.query.q : "";
  // Sanitise the search term to prevent SQL injection and ensure proper full-text search behavior
  // Where symbols are present, use websearch_to_tsquery for more flexible search
  // Otherwise use to_tsquery for simple alphanumeric search terms
  const sanitisedSearchTerm = sql<boolean>`
    "search_doc" @@ CASE
      WHEN ${searchTerm} ~ '^[[:alnum:]]+$'
        THEN to_tsquery('english', ${searchTerm} || ':*')
      ELSE websearch_to_tsquery('english', ${searchTerm})
    END
  `;
  const pageSize = config.search.pageSize;
  const currentPage = (parseInt(req.query.page as string) || 1) - 1;
  const searchPage = currentPage + 1;

  const queryCategories = getSearchCategories(req.query);

  const categoriesQueryString = getCategoriesQueryString(queryCategories);

  const queryParams = {
    limit: pageSize,
    offset: pageSize * currentPage,
  };

  // Each result can span several GMDN categories, so match any
  // result with at least one of the selected categories. The "No
  // category" checkbox has an empty value and matches aggregations with no
  // GMDN categories at all.
  const selectedGmdnNames = queryCategories.filter((c) => c !== "");
  const noCategorySelected = queryCategories.includes("");
  const categoryFilter = sql<boolean>`(
    "gmdn_names" && ${selectedGmdnNames}::varchar[]
    OR (${noCategorySelected} AND cardinality("gmdn_names") = 0)
  )`;

  const searchResultsQuery = db
    .withSchema("external")
    .selectFrom("aggregation_search")
    .where(sanitisedSearchTerm);

  const filteredSearchResultsQuery =
    queryCategories.length > 0
      ? searchResultsQuery.where(categoryFilter)
      : searchResultsQuery;

  // Get the total count of search results for the given search term
  const searchResultsCount = await filteredSearchResultsQuery
    .select(db.fn.countAll<string>().as("count"))
    .executeTakeFirstOrThrow()
    .then((result) => Number(result.count));

  const searchOffset = searchResultsCount > 0 ? currentPage * pageSize + 1 : 0;
  const searchMaxPages =
    Math.trunc(searchResultsCount / pageSize) +
    Math.min(searchResultsCount % pageSize, 1);

  // Get the categories for the filter sidebar, along with the count of
  // aggregations in each category. An aggregation is counted once in every
  // category it belongs to, and aggregations without a category are counted
  // under null ("No category").
  const categoriesInSearchResults = await db
    .selectFrom(
      searchResultsQuery
        .select(
          sql<null | string>`unnest(
            CASE
              WHEN cardinality("gmdn_names") = 0 THEN ARRAY[NULL]::varchar[]
              ELSE "gmdn_names"
            END
          )`.as("gmdnName"),
        )
        .as("c"),
    )
    .select(["c.gmdnName", db.fn.countAll<string>().as("count")])
    .groupBy("c.gmdnName")
    .orderBy("count", "desc")
    .execute()
    .then((results) =>
      results.map((result) => ({
        checked: queryCategories.includes(result.gmdnName ?? ""),
        count: Number(result.count),
        name: result.gmdnName,
      })),
    );

  // Perform the search query with pagination and render the results page.
  // Each result is an aggregation from one supplier. Order by name and
  // supplier so pages are stable.
  const results = await filteredSearchResultsQuery
    .select([
      "aggregationName",
      "manufacturerId",
      "manufacturerName",
      "aggregationType",
      "productCount",
      "productNames",
      "models",
      "gmdnNames",
      "types",
    ])
    .orderBy("aggregationName")
    .orderBy("manufacturerName")
    .orderBy("manufacturerId")
    .limit(queryParams.limit)
    .offset(queryParams.offset)
    .execute()
    .then((results) =>
      // Add some dummy data to the results for now, until we have a proper database with these fields
      results.map((result) => ({
        ...result,
        excluded: 1,
        procured: 1,
        under_review: 1,
      })),
    );

  res.render("search-results.html", {
    categoriesQueryString,
    searchMaxPages,
    searchOffset,
    searchPage,
    searchQueryString: getSearchQueryString(req.query),
    searchResultCategories: categoriesInSearchResults,
    searchResults: results,
    searchResultsCount,
    searchTerm,
  });
};

export const renderCategories = async (req: Request, res: Response) => {
  const categories = await getTopLevelCategories();
  res.render("categories.html", { categories });
};

export const renderCategory = async (
  req: Request<{ categoryId: string }>,
  res: Response,
) => {
  const { categoryId } = req.params;

  const categoryHierarchy = await getHierarchyForCategory(Number(categoryId));

  const category = await getCategoryById(Number(categoryId));

  const subcategoryRows = await getCategoriesWithParentId(Number(categoryId));

  const deviceTypeCounts = await getDeviceTypeCountsForCategories(
    subcategoryRows.map((subcategory) => subcategory.nodeId),
  );

  const subcategories = subcategoryRows.map((subcategory) => ({
    ...subcategory,
    deviceTypeCount: deviceTypeCounts.get(subcategory.nodeId) ?? 0,
  }));

  const hierarchyLevel = categoryHierarchy.length;

  // Levels 1 and 2 are for narrowing down, so they only list subcategories.
  // From level 3 down, list every GMDN term (device type) beneath this category.
  const deviceTypes =
    hierarchyLevel >= 3
      ? await getGmdnTermsBeneathCategory(Number(categoryId))
      : [];

  res.render("category.html", {
    category,
    categoryHierarchy,
    deviceTypes,
    hierarchyLevel,
    subcategories,
  });
};

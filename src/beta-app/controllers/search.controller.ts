import { Request, Response } from "express";
import { sql } from "kysely";

import config from "../config.js";
import { db } from "../database/client.js";
import { DeviceType } from "../database/types.js";
import {
  getCategoriesWithParentId,
  getCategoryById,
  getCategoryCodeById,
  getDeviceTypeById,
  getDeviceTypesByGmdnCode,
  getGmdnTermNameByTermCode,
  getHierarchyForCategory,
  getTermCodeByCategoryCode,
  getTopLevelCategories,
} from "../services/gmdnCategoryService.js";
import { getProductsByDeviceId } from "../services/productsService.js";

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

  const queryCategories = [req.query["[category]"] ?? []]
    .flat()
    .filter((c): c is string => typeof c === "string" && c !== "_unchecked");

  const categoriesQueryString =
    queryCategories.length > 0
      ? `&${queryCategories.map((c) => `[category]=${encodeURIComponent(c)}`).join("&")}`
      : "";

  const queryParams = {
    limit: pageSize,
    offset: pageSize * currentPage,
  };

  // Each aggregation can span several GMDN categories, so match any
  // aggregation with at least one of the selected categories. The "No
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
  // Order by name so pages are stable.
  const results = await filteredSearchResultsQuery
    .select([
      "aggregationName",
      "aggregationType",
      "productCount",
      "productNames",
      "models",
      "manufacturers",
      "countries",
      "gmdnNames",
      "types",
    ])
    .orderBy("aggregationName")
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

  const subcategories = await getCategoriesWithParentId(Number(categoryId));

  const hierarchyLevel = categoryHierarchy.length;

  const payload: {
    category: typeof category;
    categoryHierarchy: typeof categoryHierarchy;
    deviceTypes: DeviceType[];
    gmdnTermName: string;
    hierarchyLevel: number;
    subcategories: typeof subcategories;
  } = {
    category,
    categoryHierarchy,
    deviceTypes: [],
    gmdnTermName: "",
    hierarchyLevel,
    subcategories,
  };

  // Check if we're at the bottom of the hierarchy (no subcategories)
  if (subcategories.length === 0) {
    // If there are no subcategories, we want to fetch the products or items associated with this category
    const categoryCode = await getCategoryCodeById(Number(categoryId));

    if (!categoryCode) {
      throw new Error(`Category code not found for category ID ${categoryId}`);
    }

    const termCode = await getTermCodeByCategoryCode(categoryCode);

    const gmdnTermName = await getGmdnTermNameByTermCode(termCode);
    const deviceTypes = await getDeviceTypesByGmdnCode(termCode);

    payload.deviceTypes = deviceTypes;
    payload.gmdnTermName = gmdnTermName;
  }

  res.render("category.html", payload);
};

export const renderDeviceType = async (
  req: Request<{ category: number; deviceTypeId: string }>,
  res: Response,
) => {
  const { deviceTypeId } = req.params;
  const category = Number(req.query.category);

  const deviceType = await getDeviceTypeById(Number(deviceTypeId));

  const products = await getProductsByDeviceId(Number(deviceTypeId));

  if (products.length === 0) {
    throw new Error(`No products found for device type ID ${deviceTypeId}`);
  }

  const categoryHierarchy = await getHierarchyForCategory(category);

  res.render("device-type.html", { categoryHierarchy, deviceType, products });
};

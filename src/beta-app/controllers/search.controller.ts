import { Request, Response } from "express";
import { type ExpressionBuilder, sql } from "kysely";

import type { Database } from "../database/types.js";

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

export const renderSearch = async (req: Request, res: Response) => {
  const categories = await getTopLevelCategories();
  res.render("search", { categories });
};

// Searches GMDN term (device type) names, and lists every supplier of each
// matching device type as its own result
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

  // The filter sidebar narrows the results to device types in any of the
  // selected GMDN categories, which are given by category code. The "No
  // category" checkbox has an empty value and matches device types that aren't
  // in any category.
  const queryCategories = getSearchCategories(req.query);
  const categoriesQueryString = getCategoriesQueryString(queryCategories);
  const selectedCategoryCodes = queryCategories.filter((c) => c !== "");
  const noCategorySelected = queryCategories.includes("");

  const searchResultsQuery = db
    .withSchema("external")
    .selectFrom("device_type_search")
    .where(sanitisedSearchTerm);

  // A device type's categories, via gmdn_category_term. Only categories that
  // exist in gmdn_category count, so those are the ones the sidebar can list.
  const categoriesOfDeviceType = (
    eb: ExpressionBuilder<Database, "device_type_search">,
  ) =>
    eb
      .selectFrom("gmdn_category_term as ct")
      .whereRef("ct.termCode", "=", "device_type_search.gmdnCode")
      .where((eb) =>
        eb.exists(
          eb
            .selectFrom("gmdn_category as c")
            .whereRef("c.categoryCode", "=", "ct.categoryCode"),
        ),
      );

  const filteredSearchResultsQuery =
    queryCategories.length > 0
      ? searchResultsQuery.where((eb) =>
          eb.or([
            ...(selectedCategoryCodes.length > 0
              ? [
                  eb.exists(
                    categoriesOfDeviceType(eb)
                      .where("ct.categoryCode", "in", selectedCategoryCodes)
                      .select("ct.categoryCode"),
                  ),
                ]
              : []),
            ...(noCategorySelected
              ? [
                  eb.not(
                    eb.exists(
                      categoriesOfDeviceType(eb).select("ct.categoryCode"),
                    ),
                  ),
                ]
              : []),
          ]),
        )
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

  // Get the categories for the filter sidebar, along with the count of results
  // in each. A result is counted once in every category its device type is in,
  // and results whose device type has no category are counted under null ("No
  // category"). A category code can appear at several places in the tree, but
  // always with the same name, so it's listed once.
  const categoriesInSearchResults = await searchResultsQuery
    .leftJoin(
      (eb) =>
        eb
          .selectFrom("gmdn_category_term as ct")
          .innerJoin("gmdn_category as c", "c.categoryCode", "ct.categoryCode")
          .select([
            "ct.termCode",
            "ct.categoryCode",
            sql<string>`min(c.name)`.as("name"),
          ])
          .groupBy(["ct.termCode", "ct.categoryCode"])
          .as("category"),
      (join) =>
        join.onRef("category.termCode", "=", "device_type_search.gmdnCode"),
    )
    .select([
      "category.categoryCode",
      sql<null | string>`min(category.name)`.as("name"),
      db.fn.countAll<string>().as("count"),
    ])
    .groupBy("category.categoryCode")
    .orderBy("count", "desc")
    .orderBy("name")
    .execute()
    .then((results) =>
      results.map((result) => ({
        checked: queryCategories.includes(result.categoryCode ?? ""),
        code: result.categoryCode,
        count: Number(result.count),
        name: result.name,
      })),
    );

  // Each result is a device type from one supplier. Order by both so pages
  // are stable.
  const results = await filteredSearchResultsQuery
    .select([
      "gmdnCode",
      "gmdnTermName",
      "manufacturerId",
      "manufacturerName",
      "deviceCount",
    ])
    .orderBy("gmdnTermName")
    .orderBy("manufacturerName")
    .orderBy("manufacturerId")
    .limit(pageSize)
    .offset(pageSize * currentPage)
    .execute();

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

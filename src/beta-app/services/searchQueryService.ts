import type { Request } from "express";

export const getSearchCategories = (query: Request["query"]) =>
  [query["[category]"] ?? []]
    .flat()
    .filter((c): c is string => typeof c === "string" && c !== "_unchecked");

export const getCategoriesQueryString = (categories: string[]) =>
  categories.length > 0
    ? `&${categories.map((c) => `[category]=${encodeURIComponent(c)}`).join("&")}`
    : "";

// The search state to carry from search results to a product page and back:
// the term, page and filters, and nothing else from the query string. Empty if
// the query isn't from a search.
export const getSearchQueryString = (query: Request["query"]) => {
  if (typeof query.q !== "string") {
    return "";
  }

  const page =
    typeof query.page === "string" && /^\d+$/.test(query.page)
      ? `&page=${query.page}`
      : "";

  return `?q=${encodeURIComponent(query.q)}${page}${getCategoriesQueryString(getSearchCategories(query))}`;
};

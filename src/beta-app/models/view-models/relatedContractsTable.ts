import type { Request } from "express";

import type { RelatedContract } from "../../services/trustDataService.js";

// The related trusts page lists contracts, filtered by category and sorted
// on the server from the query string. Sorting on the server lets the line
// above the table say how it's ordered.

type SortColumn = "category" | "start-date" | "trust";
type SortOrder = "ascending" | "descending";

const sortColumns: { key: SortColumn; text: string }[] = [
  { key: "trust", text: "Trust" },
  { key: "category", text: "Category" },
  { key: "start-date", text: "Start date" },
];

// The order each column is sorted in when it's first picked
const firstOrder: Record<SortColumn, SortOrder> = {
  category: "ascending",
  "start-date": "descending",
  trust: "ascending",
};

const orderText: Record<SortColumn, Record<SortOrder, string>> = {
  category: {
    ascending: "Contracts are listed A to Z by category.",
    descending: "Contracts are listed Z to A by category.",
  },
  "start-date": {
    ascending: "Oldest contracts are listed first.",
    descending: "Most recent contracts are listed first.",
  },
  trust: {
    ascending: "Contracts are listed A to Z by trust.",
    descending: "Contracts are listed Z to A by trust.",
  },
};

const compareBy: Record<
  SortColumn,
  (a: RelatedContract, b: RelatedContract) => number
> = {
  category: (a, b) => a.primaryCategory.localeCompare(b.primaryCategory),
  "start-date": (a, b) => a.startDate.getTime() - b.startDate.getTime(),
  trust: (a, b) => a.trust.localeCompare(b.trust),
};

export interface RelatedContractsTable {
  categoryItems: { checked: boolean; text: string; value: string }[];
  clearFiltersHref: string;
  contracts: (RelatedContract & { startMonth: string })[];
  // The state to keep when the filter form is submitted
  formInputs: { name: string; value: string }[];
  head: { href?: string; sort?: string; text: string }[];
  orderText: string;
  selectedCategoryCount: number;
  totalCount: number;
}

// keepQueryString is the rest of the page's state, such as the search the
// product was reached from, as from getSearchQueryString
export const getRelatedContractsTable = (
  allContracts: RelatedContract[],
  query: Request["query"],
  keepQueryString: string,
): RelatedContractsTable => {
  const categories = [
    ...new Set(allContracts.map((contract) => contract.primaryCategory)),
  ].sort((a, b) => a.localeCompare(b));

  // Only real categories count, so a stray value can't filter everything out
  const picked = [query.category ?? []].flat();
  const selected = categories.filter((category) => picked.includes(category));

  const sortBy = sortColumns.some(({ key }) => key === query.sort)
    ? (query.sort as SortColumn)
    : "start-date";
  const order =
    query.order === "ascending" || query.order === "descending"
      ? query.order
      : firstOrder[sortBy];

  const contracts = allContracts
    .filter(
      (contract) =>
        selected.length === 0 || selected.includes(contract.primaryCategory),
    )
    // Most recent first, then by name, among contracts that sort the same
    .sort(
      (a, b) =>
        (order === "ascending" ? 1 : -1) * compareBy[sortBy](a, b) ||
        compareBy["start-date"](b, a) ||
        a.contractName.localeCompare(b.contractName),
    )
    .map((contract) => ({
      ...contract,
      startMonth: contract.startDate.toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      }),
    }));

  const href = (params: [string, string][]) => {
    const search = new URLSearchParams([
      ...new URLSearchParams(keepQueryString),
      ...params,
    ]).toString();
    return `?${search}`;
  };
  const filterParams = selected.map((category): [string, string] => [
    "category",
    category,
  ]);
  const sortParams: [string, string][] = [
    ["sort", sortBy],
    ["order", order],
  ];

  return {
    categoryItems: categories.map((category) => ({
      checked: selected.includes(category),
      text: `${category} (${String(
        allContracts.filter((contract) => contract.primaryCategory === category)
          .length,
      )})`,
      value: category,
    })),
    clearFiltersHref: href(sortParams),
    contracts,
    formInputs: [...new URLSearchParams(keepQueryString), ...sortParams].map(
      ([name, value]) => ({ name, value }),
    ),
    // Contract names are free text, so they aren't sortable
    head: [
      { text: "Contract" },
      ...sortColumns.map(({ key, text }) => {
        const isCurrent = key === sortBy;
        const nextOrder = isCurrent
          ? order === "ascending"
            ? "descending"
            : "ascending"
          : firstOrder[key];
        return {
          href: href([...filterParams, ["sort", key], ["order", nextOrder]]),
          sort: isCurrent ? order : "none",
          text,
        };
      }),
    ],
    orderText: orderText[sortBy][order],
    selectedCategoryCount: selected.length,
    totalCount: allContracts.length,
  };
};

/* eslint-disable perfectionist/sort-interfaces */
import { Generated, Selectable } from "kysely";

export interface Database {
  organisation: OrganisationTable;
  search: SearchTable;
}

export type Organisation = Selectable<OrganisationTable>;

export interface OrganisationTable {
  organisation_id: Generated<number>;
  organisation_name: string;
}

export type Search = Selectable<SearchTable>;

export interface SearchTable {
  gmdnName: string;
  make: string;
  makeId: string;
  

  // Temp hardcoded properties
  excluded: number;
  procured: number;
  under_review: number;
  

  // FTS5 virtual table column for MATCH
  search: string;
}

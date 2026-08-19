import SQLite from "better-sqlite3";
import { CamelCasePlugin, Kysely, SqliteDialect } from "kysely";

import { Database } from "./types.js";

const dialect = new SqliteDialect({
  database: new SQLite("database_big.db"),
});

export const db = new Kysely<Database>({
  dialect,
  plugins: [new CamelCasePlugin({ upperCase: true })],
});

import { Pool} from 'pg'
import { CamelCasePlugin, Kysely, PostgresDialect } from "kysely";
import * as path from 'path'
import { promises as fs } from 'fs'
import { readFileSync } from 'fs'
import { FileMigrationProvider, Migrator } from 'kysely/migration'
import { fileURLToPath } from 'url';
import config from "../config.js";

import { Database } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readPasswordFile(path) {
  const raw = readFileSync(path, {encoding: 'utf8'});
  // Remove trailing \n or \r\n
  if (raw.at(-1) === '\n') {
    return raw.slice(0, raw.at(-2) === '\r' ? -2 : -1);
  } else {
    return raw;
  }
}

const dbConfig = {
  database: config.database.database,
  user: config.database.user,
  password: readPasswordFile(config.database.password_file),
  host: config.database.host,
};

export const pgPool = new Pool(dbConfig);

const dialect = new PostgresDialect({
  pool: pgPool
});

export const db = new Kysely<Database>({
  dialect,
  plugins: [new CamelCasePlugin({ upperCase: false })],
});

async function applyMigrations(schema, migrationsPath) {
  console.log("Checking for migrations in " + migrationsPath + ":")

  const migrator = new Migrator({
    db,
    migrationTableSchema: schema,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, migrationsPath),
    }),
  })

  const { error, results } = await migrator.migrateToLatest()

  results?.forEach((it) => {
    if (it.status === 'Success') {
      console.log(`  ✅ migration "${it.migrationName}" was executed successfully`)
    } else if (it.status === 'Error') {
      console.error(`  ❌ failed to execute migration "${it.migrationName}"`)
    }
  })

  if (error) {
    console.error('❌ failed to migrate')
    console.error(error)
    process.exit(1)
  }
}

export async function applyAllMigrations() {
  // FIXME: Put a retry loop in in case the database is still starting up at this point
  
  // We do external first, as app may reference things from the external schema.
  await pgPool.query("CREATE SCHEMA IF NOT EXISTS external")
  await applyMigrations('external','external-schema')

  await pgPool.query("CREATE SCHEMA IF NOT EXISTS app")
  await applyMigrations('app','app-schema')
}

import { promises as fs } from 'fs'
import { readFileSync } from 'fs'
import { CamelCasePlugin, Kysely, PostgresDialect } from "kysely";
import { FileMigrationProvider, Migrator } from 'kysely/migration'
import * as path from 'path'
import { Pool} from 'pg'
import { fileURLToPath } from 'url';

import config from "../config.js";
import { Database } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readPasswordFile(path: string) {
  const raw = readFileSync(path, {encoding: 'utf8'});
  // Remove trailing \n or \r\n
  if (raw.at(-1) === '\n') {
    return raw.slice(0, raw.at(-2) === '\r' ? -2 : -1);
  } else {
    return raw;
  }
}

// Check here rather than in config.ts so it only errors if you actually try to connect
// to the database, eg not when running unit tests etc
if(!(config.database.database &&
  config.database.user &&
  config.database.password_file &&
  config.database.host)) {
  console.error("All of the DATABASE_NAME, DATABASE_HOST, DATABASE_USER and DATABASE_PASSWORD_FILE environment variables must be set")
  process.exit(1)
}

const dbConfig = {
  database: config.database.database,
  host: config.database.host,
  password: readPasswordFile(config.database.password_file),
  user: config.database.user,
};

export const pgPool = new Pool(dbConfig);

const dialect = new PostgresDialect({
  pool: pgPool
});

export const db = new Kysely<Database>({
  dialect,
  plugins: [new CamelCasePlugin({ upperCase: false })],
});

export async function applyAllMigrations() {
  // We do external first, as app may reference things from the external schema.
  await pgPool.query("CREATE SCHEMA IF NOT EXISTS external")
  await applyMigrations('external','external-schema')

  await pgPool.query("CREATE SCHEMA IF NOT EXISTS app")
  await applyMigrations('app','app-schema')

  console.log(`✅ database schema is up to date`)
}

async function applyMigrations(schema: string, migrationsPath: string) {
  console.log("Checking for migrations in " + migrationsPath + ":")

  const migrator = new Migrator({
    db,
    migrationTableSchema: schema,
    provider: new FileMigrationProvider({
      fs,
      migrationFolder: path.join(__dirname, migrationsPath),
      path,
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

import { applyAllMigrations, db } from "../database/client.js";

try {
  await applyAllMigrations();
} finally {
  // Close db connection after applying migrations rather than waiting for idle timeout
  await db.destroy();
}

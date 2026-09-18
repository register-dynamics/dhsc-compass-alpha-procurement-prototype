const DEFAULT_SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 8; // 8 hours in milliseconds

const resolveSessionMaxAgeMs = (rawValue: string | undefined) => {
  const parsedValue = Number(rawValue);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return DEFAULT_SESSION_MAX_AGE_MS;
  }

  return parsedValue;
};

const config = {
  app: {
    name: "Search and evaluate medical technologies",
  },
  database: {
    database: process.env.DATABASE_NAME,
    host: process.env.DATABASE_HOST,
    password_file: process.env.DATABASE_PASSWORD_FILE,
    user: process.env.DATABASE_USER,
  },
  env: process.env.NODE_ENV ?? "development",
  search: {
    pageSize: 25,
  },
  session: {
    cookie: {
      httpOnly: true,
      maxAgeMs: resolveSessionMaxAgeMs(process.env.SESSION_COOKIE_MAX_AGE_MS),
      sameSite: "lax" as const,
    },
    secret: process.env.SESSION_SECRET ?? "default-secret",
  },
};

export default config;

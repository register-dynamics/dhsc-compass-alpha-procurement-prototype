const config = {
  app: {
    name: "Search and evaluate medical technologies",
  },
  env: process.env.NODE_ENV ?? "development",
  search: {
    pageSize: 25,
  },
  session: {
    secret: process.env.SESSION_SECRET ?? "default-secret",
  },
};

export default config;

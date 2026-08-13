import express from "express";

import config from "./config.js";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send(`Hello, world! Welcome to ${config.app.name}.`);
});

export default app;

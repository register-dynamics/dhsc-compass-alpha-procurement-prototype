import app from "./app.js";
import config from "./config.js";

const port = process.env.PORT ?? 3000;

app.listen(port, () => {
  console.log(
    `Server listening on port ${String(port)} for ${config.app.name}`,
  );
});

app.get("/", (req, res) => {
  res.send(`Hello, world! Welcome to ${config.app.name}.`);
});

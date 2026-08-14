import app from "./app.js";
import config from "./config.js";

const port = process.env.PORT ?? 3001;

app.listen(port, () => {
  console.log(
    `Server listening on port ${String(port)} for ${config.app.name}`,
  );
});

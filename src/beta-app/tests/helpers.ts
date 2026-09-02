import request from "supertest";

import app from "../app.js";

const testUser = {
  password: "northsouth",
  username: "test@example.com",
};

const loginAndGetCookie = async () => {
  const response = await request(app)
    .post("/sign-in")
    .send(testUser)
    .set("Content-Type", "application/x-www-form-urlencoded");

  const cookies = response.headers["set-cookie"];
  return cookies;
};

export { loginAndGetCookie };

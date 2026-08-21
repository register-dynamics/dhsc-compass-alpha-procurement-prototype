import type { Express } from "express";

import argon2 from "argon2";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";

import type { User } from "../database/types.js";

import { db } from "../database/client.js";

const normalizeAuthError = (error: unknown) => {
  if (error instanceof Error) {
    return error;
  }

  return new Error("Authentication error");
};

passport.use(
  new LocalStrategy(function (username, password, done) {
    console.log("Authenticating user:", username);

    (async () => {
      const user = await db
        .selectFrom("users")
        .selectAll()
        .where("users.username", "=", username)
        .executeTakeFirst();

      if (!user) {
        console.log("User not found:", username);
        done(null, false, { message: "Invalid username" });
        return;
      }

      console.log("User found with id: ", user.id);

      const isValid = await argon2.verify(user.passwordHash, password);

      if (!isValid) {
        done(null, false, { message: "Invalid password" });
        return;
      }

      done(null, user);
    })().catch((error: unknown) => {
      done(normalizeAuthError(error));
    });
  }),
);

passport.serializeUser((user, done) => {
  const storedUser = user as User;

  done(null, storedUser.id);
});

passport.deserializeUser((id, done) => {
  db.selectFrom("users")
    .selectAll()
    .where("id", "=", id as number)
    .executeTakeFirst()
    .then((user) => {
      done(null, user ?? false);
    })
    .catch((err: unknown) => {
      done(normalizeAuthError(err));
    });
});

export const initializeAuth = (app: Express) => {
  app.use(passport.initialize());
  app.use(passport.session());
};

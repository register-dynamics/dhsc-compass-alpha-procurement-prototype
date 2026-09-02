import { NextFunction, Request, RequestHandler, Response } from "express";
import passport from "passport";

export const renderSignIn = (req: Request, res: Response) => {
  // If the user is already authenticated, redirect them to the home page
  if (req.isAuthenticated()) {
    res.redirect("/");
    return;
  }

  const signInHasFailed =
    req.session.messages && req.session.messages.length > 0;

  res.render("sign-in", {
    signInHasFailed,
  });
};

export const postSignIn = (req: Request, res: Response, next: NextFunction) => {
  const authenticate = passport.authenticate("local", {
    failureMessage: true,
    failureRedirect: "/sign-in",
    successRedirect: "/",
  }) as RequestHandler;

  authenticate(req, res, next);
};

export const signOut = (req: Request, res: Response) => {
  req.logout((err) => {
    if (err) {
      console.error("Error during logout:", err);
      res.status(500).send("Error during logout");
      return;
    }

    res.redirect("/");
  });
};

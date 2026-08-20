import { Request, Response } from "express";

export const renderSignIn = (req: Request, res: Response) => {
  res.render("sign-in");
};

import { Request, Response } from "express";

export const renderProduct = (req: Request, res: Response) => {
  // Hardcoded product info for now
  const product = {
    make: "SmartPump",
    model: "300",
    manufacturer: "MedTech Innovations",
    trusts: {
      size: 5
    },
    procured: {
      size: 3
    }
  };

  res.render("product", { product });
};

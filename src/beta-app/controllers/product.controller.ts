import { Request, Response } from "express";

import { db } from "../database/client.js";

export const renderProduct = async (req: Request, res: Response) => {

  let productId;
  
  try {
    productId = parseInt(req.params.id as string);
  } catch {
    // TODO: Send to better error handling page
    return res.status(400).send("Invalid Product ID");
  }

  if (!productId) {
    // TODO: Send to better error handling page
    return res.status(400).send("Product ID is required");
  }

  const product = await db.selectFrom("search")
    .selectAll()
    .where("productId", "=", productId)
    .executeTakeFirst();

  if (!product) {
    // TODO: Send to better error handling page
    return res.status(404).send("Product not found");
  }

  res.render("product", { product });
};

import { z } from "zod";

export const postMarkUsefulSchema = z.object({
  documentId: z.coerce.number().positive().nonoptional(),
  productId: z.coerce.number().positive().nonoptional(),
});

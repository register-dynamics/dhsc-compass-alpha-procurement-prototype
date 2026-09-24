import { z } from "zod";

export const postMarkUsefulSchema = z.object({
  evidenceId: z.coerce.number().positive().nonoptional(),
  productId: z.coerce.number().positive().nonoptional(),
});

import { z } from "zod";

export const postMarkUsefulSchema = z.object({
  aggregationName: z.string().trim().min(1),
  evidenceId: z.coerce.number().positive().nonoptional(),
  supplierId: z.coerce.number().int().positive().nonoptional(),
});

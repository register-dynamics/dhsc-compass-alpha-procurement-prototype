import { z } from "zod";

export const postAddEvidenceContactSelfSchema = z.object({
  contactId: z.coerce.number().positive().nonoptional(),
});

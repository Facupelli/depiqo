import { z } from "zod";

export const problemDetailsSchema = z
  .object({
    type: z.string(),
    title: z.string(),
    status: z.number(),
    detail: z.string(),
    instance: z.string().optional(),
    requestId: z.string().optional(),
    traceId: z.string().optional(),
  })
  .catchall(z.unknown());

export type ProblemDetails = z.infer<typeof problemDetailsSchema>;

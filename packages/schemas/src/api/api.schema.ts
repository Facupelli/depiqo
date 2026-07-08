import { z } from "zod";

export const problemDetailsSchema = z
  .object({
    type: z.string(),
    title: z.string(),
    status: z.number(),
    detail: z.string(),
    instance: z.string().optional(),
  })
  .catchall(z.any());

export type ProblemDetails = z.infer<typeof problemDetailsSchema>;

export type PaginatedDto<T> = {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

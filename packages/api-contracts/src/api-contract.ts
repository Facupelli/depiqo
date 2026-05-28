import { z } from "zod";

export const httpMethodSchema = z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]);

export type HttpMethod = z.infer<typeof httpMethodSchema>;

export type ApiContract<
  TParams extends z.ZodType | undefined = undefined,
  TQuery extends z.ZodType | undefined = undefined,
  THeaders extends z.ZodType | undefined = undefined,
  TBody extends z.ZodType | undefined = undefined,
  TResponse extends z.ZodType = z.ZodType,
> = {
  method: HttpMethod;
  path: string;
  params?: TParams;
  query?: TQuery;
  headers?: THeaders;
  body?: TBody;
  response: TResponse;
};

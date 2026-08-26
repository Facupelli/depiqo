import { z } from "zod";

export const AssetStatusSchema = z.enum(["ACTIVE", "INACTIVE", "RETIRED"]);

export type AssetStatusDto = z.infer<typeof AssetStatusSchema>;

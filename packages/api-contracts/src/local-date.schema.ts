import { z } from "zod";

export const LocalDateSchema = z.iso.date();

export type LocalDate = z.infer<typeof LocalDateSchema>;

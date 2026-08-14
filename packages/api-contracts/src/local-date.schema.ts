import { z } from "zod";

/**
 * A business calendar date, independent of any time or timezone.
 */
export const LocalDateSchema = z.iso.date();

export type LocalDate = z.infer<typeof LocalDateSchema>;

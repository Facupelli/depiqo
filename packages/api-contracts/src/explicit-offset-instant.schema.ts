import { z } from "zod";

/**
 * An absolute instant supplied at an API boundary.
 *
 * The input must include either `Z` or an RFC3339 numeric UTC offset. The
 * validated value is converted to a JavaScript Date for application use.
 */
export const ExplicitOffsetInstantSchema = z.iso
  .datetime({ offset: true })
  .transform((value) => new Date(value));

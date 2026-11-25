import { z } from "zod";

export const ExplicitOffsetInstantWireSchema = z.iso.datetime({ offset: true });

export const ExplicitOffsetInstantSchema =
  ExplicitOffsetInstantWireSchema.transform((value) => new Date(value));

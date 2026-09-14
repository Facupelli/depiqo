import {
  ExplicitOffsetInstantSchema,
  UpdateDraftRentalBodySchema,
  UpdateDraftRentalParamsSchema,
} from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export const UpdateDraftRentalApplicationInputSchema = UpdateDraftRentalBodySchema.transform((body) => ({
  ...body,
  period: {
    start: ExplicitOffsetInstantSchema.parse(body.period.start),
    end: ExplicitOffsetInstantSchema.parse(body.period.end),
  },
}));

export class UpdateDraftRentalParamsDto extends createZodDto(UpdateDraftRentalParamsSchema) {}
export class UpdateDraftRentalRequestDto extends createZodDto(UpdateDraftRentalApplicationInputSchema) {}

import {
  AssetUnavailabilityListParamsSchema,
  AssetUnavailabilityPeriodParamsSchema,
  ExplicitOffsetInstantSchema,
  RescheduleAssetUnavailabilityBodySchema,
  ScheduleAssetUnavailabilityBodySchema,
} from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class AssetUnavailabilityListParamsDto extends createZodDto(AssetUnavailabilityListParamsSchema) {}
export class AssetUnavailabilityPeriodParamsDto extends createZodDto(AssetUnavailabilityPeriodParamsSchema) {}

export class ScheduleAssetUnavailabilityRequestDto extends createZodDto(
  ScheduleAssetUnavailabilityBodySchema.extend({
    startsAt: ExplicitOffsetInstantSchema.optional(),
    endsAt: ExplicitOffsetInstantSchema,
  }),
) {}

export class RescheduleAssetUnavailabilityRequestDto extends createZodDto(
  RescheduleAssetUnavailabilityBodySchema.extend({
    startsAt: ExplicitOffsetInstantSchema,
    endsAt: ExplicitOffsetInstantSchema,
  }),
) {}

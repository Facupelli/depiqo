import { GetAssetAvailabilityTimelineQuerySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetAssetAvailabilityTimelineRequestDto extends createZodDto(GetAssetAvailabilityTimelineQuerySchema) {}

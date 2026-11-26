import { GetAssetAvailabilityTimelineResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetAssetAvailabilityTimelineResponseDto extends createZodDto(GetAssetAvailabilityTimelineResponseSchema) {}

import { GetReplacementAssetCandidatesResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetReplacementAssetCandidatesResponseDto extends createZodDto(
  GetReplacementAssetCandidatesResponseSchema,
) {}

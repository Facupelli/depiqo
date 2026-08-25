import { GetReplacementAssetCandidatesParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetReplacementAssetCandidatesParamsDto extends createZodDto(GetReplacementAssetCandidatesParamsSchema) {}

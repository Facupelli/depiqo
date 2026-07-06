import { GetAssetSummariesQuerySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetAssetSummariesRequestDto extends createZodDto(GetAssetSummariesQuerySchema) {}

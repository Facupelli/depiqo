import { ReactivateAssetParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class ReactivateAssetParamsDto extends createZodDto(ReactivateAssetParamsSchema) {}

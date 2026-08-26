import { UpdateAssetBodySchema, UpdateAssetParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdateAssetParamsDto extends createZodDto(UpdateAssetParamsSchema) {}
export class UpdateAssetRequestDto extends createZodDto(UpdateAssetBodySchema) {}

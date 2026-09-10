import { DeactivateAssetParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class DeactivateAssetParamsDto extends createZodDto(DeactivateAssetParamsSchema) {}

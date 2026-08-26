import { ChangeAssetOwnerBodySchema, ChangeAssetOwnerParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class ChangeAssetOwnerParamsDto extends createZodDto(ChangeAssetOwnerParamsSchema) {}
export class ChangeAssetOwnerRequestDto extends createZodDto(ChangeAssetOwnerBodySchema) {}

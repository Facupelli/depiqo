import { ReplaceConfirmedRentalAssetBodySchema, ReplaceConfirmedRentalAssetParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class ReplaceConfirmedRentalAssetParamsDto extends createZodDto(ReplaceConfirmedRentalAssetParamsSchema) {}

export class ReplaceConfirmedRentalAssetRequestDto extends createZodDto(ReplaceConfirmedRentalAssetBodySchema) {}

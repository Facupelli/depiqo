import { ReplaceConfirmedRentalAssetResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class ReplaceConfirmedRentalAssetResponseDto extends createZodDto(ReplaceConfirmedRentalAssetResponseSchema) {}

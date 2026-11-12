import { PreviewDraftRentalCostResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class PreviewDraftRentalCostResponseDto extends createZodDto(PreviewDraftRentalCostResponseSchema) {}

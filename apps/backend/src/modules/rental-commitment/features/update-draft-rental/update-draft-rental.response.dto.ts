import { UpdateDraftRentalResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdateDraftRentalResponseDto extends createZodDto(UpdateDraftRentalResponseSchema) {}

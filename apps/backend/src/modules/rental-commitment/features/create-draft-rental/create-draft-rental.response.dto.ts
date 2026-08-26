import { CreateDraftRentalResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateDraftRentalResponseDto extends createZodDto(CreateDraftRentalResponseSchema) {}

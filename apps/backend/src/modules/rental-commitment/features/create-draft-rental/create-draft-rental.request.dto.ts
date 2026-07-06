import { CreateDraftRentalBodySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export const CreateDraftRentalSchema = CreateDraftRentalBodySchema;

export class CreateDraftRentalRequestDto extends createZodDto(CreateDraftRentalSchema) {}

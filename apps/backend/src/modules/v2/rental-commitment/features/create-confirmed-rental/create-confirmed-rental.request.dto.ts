import { CreateConfirmedRentalBodySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export const CreateConfirmedRentalSchema = CreateConfirmedRentalBodySchema;

export class CreateConfirmedRentalRequestDto extends createZodDto(CreateConfirmedRentalSchema) {}

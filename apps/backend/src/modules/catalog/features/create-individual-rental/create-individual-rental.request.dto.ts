import { CreateIndividualRentalBodySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateIndividualRentalRequestDto extends createZodDto(CreateIndividualRentalBodySchema) {}

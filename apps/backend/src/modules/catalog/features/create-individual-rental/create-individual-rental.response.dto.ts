import { CreateIndividualRentalResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateIndividualRentalResponseDto extends createZodDto(CreateIndividualRentalResponseSchema) {}

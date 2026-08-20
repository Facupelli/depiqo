import { CreateConfirmedRentalResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateConfirmedRentalResponseDto extends createZodDto(CreateConfirmedRentalResponseSchema) {}

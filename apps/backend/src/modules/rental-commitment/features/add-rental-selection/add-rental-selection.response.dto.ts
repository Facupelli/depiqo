import { AddRentalSelectionResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class AddRentalSelectionResponseDto extends createZodDto(AddRentalSelectionResponseSchema) {}

import { RemoveRentalSelectionResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class RemoveRentalSelectionResponseDto extends createZodDto(RemoveRentalSelectionResponseSchema) {}

import { RemoveRentalSelectionBodySchema, RemoveRentalSelectionParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class RemoveRentalSelectionParamsDto extends createZodDto(RemoveRentalSelectionParamsSchema) {}
export class RemoveRentalSelectionRequestDto extends createZodDto(RemoveRentalSelectionBodySchema) {}

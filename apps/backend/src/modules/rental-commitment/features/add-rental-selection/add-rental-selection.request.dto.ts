import { AddRentalSelectionBodySchema, AddRentalSelectionParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class AddRentalSelectionParamsDto extends createZodDto(AddRentalSelectionParamsSchema) {}

export class AddRentalSelectionRequestDto extends createZodDto(AddRentalSelectionBodySchema) {}

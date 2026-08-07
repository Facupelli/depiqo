import { EditConfirmedRentalBodySchema, EditConfirmedRentalParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class EditConfirmedRentalParamsDto extends createZodDto(EditConfirmedRentalParamsSchema) {}

export class EditConfirmedRentalRequestDto extends createZodDto(EditConfirmedRentalBodySchema) {}

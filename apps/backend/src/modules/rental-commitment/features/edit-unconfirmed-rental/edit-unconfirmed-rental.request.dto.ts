import { EditUnconfirmedRentalBodySchema, EditUnconfirmedRentalParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class EditUnconfirmedRentalParamsDto extends createZodDto(EditUnconfirmedRentalParamsSchema) {}

export class EditUnconfirmedRentalRequestDto extends createZodDto(EditUnconfirmedRentalBodySchema) {}

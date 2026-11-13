import { ConfirmRentalBodySchema, ConfirmRentalParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class ConfirmRentalParamsDto extends createZodDto(ConfirmRentalParamsSchema) {}

export class ConfirmRentalBodyDto extends createZodDto(ConfirmRentalBodySchema) {}

import { ChangeRentalDetailsBodySchema, ChangeRentalDetailsParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class ChangeRentalDetailsParamsDto extends createZodDto(ChangeRentalDetailsParamsSchema) {}
export class ChangeRentalDetailsRequestDto extends createZodDto(ChangeRentalDetailsBodySchema) {}

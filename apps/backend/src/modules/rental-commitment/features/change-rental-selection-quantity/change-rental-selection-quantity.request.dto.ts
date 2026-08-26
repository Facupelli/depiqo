import {
  ChangeRentalSelectionQuantityBodySchema,
  ChangeRentalSelectionQuantityParamsSchema,
} from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';
export class ChangeRentalSelectionQuantityParamsDto extends createZodDto(ChangeRentalSelectionQuantityParamsSchema) {}
export class ChangeRentalSelectionQuantityRequestDto extends createZodDto(ChangeRentalSelectionQuantityBodySchema) {}

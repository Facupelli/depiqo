import {
  ChangeConfirmedRentalDeliveryBodySchema,
  ChangeConfirmedRentalDeliveryParamsSchema,
} from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class ChangeConfirmedRentalDeliveryRequestDto extends createZodDto(ChangeConfirmedRentalDeliveryBodySchema) {}
export class ChangeConfirmedRentalDeliveryParamsDto extends createZodDto(ChangeConfirmedRentalDeliveryParamsSchema) {}

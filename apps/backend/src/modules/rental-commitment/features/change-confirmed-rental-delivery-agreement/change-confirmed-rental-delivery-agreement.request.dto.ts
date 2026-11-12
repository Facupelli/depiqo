import {
  ChangeConfirmedRentalDeliveryAgreementBodySchema,
  ChangeConfirmedRentalDeliveryAgreementParamsSchema,
} from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class ChangeConfirmedRentalDeliveryAgreementParamsDto extends createZodDto(
  ChangeConfirmedRentalDeliveryAgreementParamsSchema,
) {}
export class ChangeConfirmedRentalDeliveryAgreementRequestDto extends createZodDto(
  ChangeConfirmedRentalDeliveryAgreementBodySchema,
) {}

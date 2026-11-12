import { ChangeConfirmedRentalDeliveryAgreementResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class ChangeConfirmedRentalDeliveryAgreementResponseDto extends createZodDto(
  ChangeConfirmedRentalDeliveryAgreementResponseSchema,
) {}

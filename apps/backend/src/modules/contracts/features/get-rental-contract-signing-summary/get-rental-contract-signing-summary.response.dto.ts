import { GetRentalContractSigningSummaryResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetRentalContractSigningSummaryResponseDto extends createZodDto(
  GetRentalContractSigningSummaryResponseSchema,
) {}

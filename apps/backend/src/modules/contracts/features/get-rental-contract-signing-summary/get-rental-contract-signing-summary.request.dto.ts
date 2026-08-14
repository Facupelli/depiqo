import { GetRentalContractSigningSummaryParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetRentalContractSigningSummaryParamsDto extends createZodDto(
  GetRentalContractSigningSummaryParamsSchema,
) {}

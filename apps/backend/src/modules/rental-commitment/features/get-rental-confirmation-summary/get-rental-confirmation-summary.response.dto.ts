import { GetRentalConfirmationSummaryResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetRentalConfirmationSummaryResponseDto extends createZodDto(GetRentalConfirmationSummaryResponseSchema) {}

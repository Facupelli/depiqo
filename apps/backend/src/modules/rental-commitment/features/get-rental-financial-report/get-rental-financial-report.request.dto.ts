import { GetRentalFinancialReportQuerySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetRentalFinancialReportRequestDto extends createZodDto(GetRentalFinancialReportQuerySchema) {}

import { GetCustomerSummaryParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetCustomerSummaryParamsDto extends createZodDto(GetCustomerSummaryParamsSchema) {}

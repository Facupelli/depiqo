import { GetRentalOrdersReportQuerySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetRentalOrdersReportRequestDto extends createZodDto(GetRentalOrdersReportQuerySchema) {}

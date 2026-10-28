import { GetRentalOrdersReportResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetRentalOrdersReportResponseDto extends createZodDto(GetRentalOrdersReportResponseSchema) {}

import { GetInvoiceParamsSchema, GetInvoiceQuerySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetInvoiceParamsDto extends createZodDto(GetInvoiceParamsSchema) {}
export class GetInvoiceQueryDto extends createZodDto(GetInvoiceQuerySchema) {}

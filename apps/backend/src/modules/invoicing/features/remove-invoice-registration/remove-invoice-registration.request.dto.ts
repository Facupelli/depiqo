import { RemoveInvoiceRegistrationParamsSchema, RemoveInvoiceRegistrationQuerySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class RemoveInvoiceRegistrationParamsDto extends createZodDto(RemoveInvoiceRegistrationParamsSchema) {}
export class RemoveInvoiceRegistrationQueryDto extends createZodDto(RemoveInvoiceRegistrationQuerySchema) {}

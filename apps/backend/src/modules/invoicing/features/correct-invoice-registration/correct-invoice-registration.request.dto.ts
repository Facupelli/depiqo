import { CorrectInvoiceRegistrationBodySchema, CorrectInvoiceRegistrationParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CorrectInvoiceRegistrationParamsDto extends createZodDto(CorrectInvoiceRegistrationParamsSchema) {}
export class CorrectInvoiceRegistrationRequestDto extends createZodDto(CorrectInvoiceRegistrationBodySchema) {}

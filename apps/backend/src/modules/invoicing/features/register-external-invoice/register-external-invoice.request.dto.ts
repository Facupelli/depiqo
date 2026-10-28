import { RegisterExternalInvoiceBodySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class RegisterExternalInvoiceRequestDto extends createZodDto(RegisterExternalInvoiceBodySchema) {}

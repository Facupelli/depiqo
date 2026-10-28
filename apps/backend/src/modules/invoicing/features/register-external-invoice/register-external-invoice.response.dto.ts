import { RegisterExternalInvoiceResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class RegisterExternalInvoiceResponseDto extends createZodDto(RegisterExternalInvoiceResponseSchema) {}

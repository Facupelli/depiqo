import { CorrectInvoiceRegistrationResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CorrectInvoiceRegistrationResponseDto extends createZodDto(CorrectInvoiceRegistrationResponseSchema) {}

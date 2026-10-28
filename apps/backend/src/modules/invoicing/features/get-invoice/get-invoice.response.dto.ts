import { GetInvoiceResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetInvoiceResponseDto extends createZodDto(GetInvoiceResponseSchema) {}

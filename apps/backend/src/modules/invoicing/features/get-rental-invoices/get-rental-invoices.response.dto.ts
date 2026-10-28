import { GetRentalInvoicesResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetRentalInvoicesResponseDto extends createZodDto(GetRentalInvoicesResponseSchema) {}

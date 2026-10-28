import { GetRentalInvoicesQuerySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetRentalInvoicesRequestDto extends createZodDto(GetRentalInvoicesQuerySchema) {}

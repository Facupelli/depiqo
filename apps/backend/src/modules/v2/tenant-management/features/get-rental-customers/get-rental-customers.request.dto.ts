import { GetRentalCustomersQuerySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetRentalCustomersRequestDto extends createZodDto(GetRentalCustomersQuerySchema) {}

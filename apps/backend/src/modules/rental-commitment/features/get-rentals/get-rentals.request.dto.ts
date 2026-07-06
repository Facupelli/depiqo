import { GetRentalsQuerySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetRentalsRequestDto extends createZodDto(GetRentalsQuerySchema) {}

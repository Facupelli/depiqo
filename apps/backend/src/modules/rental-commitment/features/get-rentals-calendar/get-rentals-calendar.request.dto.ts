import { GetRentalsCalendarQuerySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetRentalsCalendarRequestDto extends createZodDto(GetRentalsCalendarQuerySchema) {}

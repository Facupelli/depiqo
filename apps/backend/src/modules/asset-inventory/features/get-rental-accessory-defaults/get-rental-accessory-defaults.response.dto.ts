import { GetRentalAccessoryDefaultsResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetRentalAccessoryDefaultsResponseDto extends createZodDto(GetRentalAccessoryDefaultsResponseSchema) {}

import { GetRentalDetailResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetRentalDetailResponseDto extends createZodDto(GetRentalDetailResponseSchema) {}

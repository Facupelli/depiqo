import { ChangeRentalPeriodResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class ChangeRentalPeriodResponseDto extends createZodDto(ChangeRentalPeriodResponseSchema) {}

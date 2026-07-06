import { CreateRatePlanResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateRatePlanResponseDto extends createZodDto(CreateRatePlanResponseSchema) {}

import { CorrectRatePlanResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CorrectRatePlanResponseDto extends createZodDto(CorrectRatePlanResponseSchema) {}

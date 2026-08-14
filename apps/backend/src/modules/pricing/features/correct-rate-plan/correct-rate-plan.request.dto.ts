import { CorrectRatePlanBodySchema, CorrectRatePlanParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CorrectRatePlanParamsDto extends createZodDto(CorrectRatePlanParamsSchema) {}
export class CorrectRatePlanRequestDto extends createZodDto(CorrectRatePlanBodySchema) {}

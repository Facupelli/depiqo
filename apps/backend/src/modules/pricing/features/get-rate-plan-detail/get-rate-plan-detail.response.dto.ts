import { GetRatePlanDetailResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetRatePlanDetailResponseDto extends createZodDto(GetRatePlanDetailResponseSchema) {}

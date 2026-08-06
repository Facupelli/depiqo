import { GetRatePlanDetailParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetRatePlanDetailParamsDto extends createZodDto(GetRatePlanDetailParamsSchema) {}

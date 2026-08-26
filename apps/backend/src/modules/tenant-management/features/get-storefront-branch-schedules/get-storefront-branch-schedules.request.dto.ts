import { GetStorefrontBranchSchedulesParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetStorefrontBranchSchedulesParamsDto extends createZodDto(GetStorefrontBranchSchedulesParamsSchema) {}

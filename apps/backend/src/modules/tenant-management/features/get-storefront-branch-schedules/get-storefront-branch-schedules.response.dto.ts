import { GetStorefrontBranchSchedulesResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetStorefrontBranchSchedulesResponseDto extends createZodDto(GetStorefrontBranchSchedulesResponseSchema) {}

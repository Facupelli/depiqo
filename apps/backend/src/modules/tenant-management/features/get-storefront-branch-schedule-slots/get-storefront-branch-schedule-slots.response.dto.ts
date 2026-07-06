import { GetStorefrontBranchScheduleSlotsResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetStorefrontBranchScheduleSlotsResponseDto extends createZodDto(
  GetStorefrontBranchScheduleSlotsResponseSchema,
) {}

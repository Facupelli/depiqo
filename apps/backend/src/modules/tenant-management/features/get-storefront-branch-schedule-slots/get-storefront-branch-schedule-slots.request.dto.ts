import {
  GetStorefrontBranchScheduleSlotsParamsSchema,
  GetStorefrontBranchScheduleSlotsQuerySchema,
} from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetStorefrontBranchScheduleSlotsParamsDto extends createZodDto(
  GetStorefrontBranchScheduleSlotsParamsSchema,
) {}

export class GetStorefrontBranchScheduleSlotsRequestDto extends createZodDto(
  GetStorefrontBranchScheduleSlotsQuerySchema,
) {}

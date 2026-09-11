import {
  ReplaceRentalDemandLineAccessoriesBodySchema,
  ReplaceRentalDemandLineAccessoriesParamsSchema,
} from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class ReplaceRentalDemandLineAccessoriesParamsDto extends createZodDto(
  ReplaceRentalDemandLineAccessoriesParamsSchema,
) {}
export class ReplaceRentalDemandLineAccessoriesRequestDto extends createZodDto(
  ReplaceRentalDemandLineAccessoriesBodySchema,
) {}

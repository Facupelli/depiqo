import {
  RemoveConfirmedPackageDemandLineBodySchema,
  RemoveConfirmedPackageDemandLineParamsSchema,
} from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class RemoveConfirmedPackageDemandLineParamsDto extends createZodDto(
  RemoveConfirmedPackageDemandLineParamsSchema,
) {}
export class RemoveConfirmedPackageDemandLineRequestDto extends createZodDto(
  RemoveConfirmedPackageDemandLineBodySchema,
) {}

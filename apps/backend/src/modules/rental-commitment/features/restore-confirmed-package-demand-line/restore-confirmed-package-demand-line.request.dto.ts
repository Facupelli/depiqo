import {
  RestoreConfirmedPackageDemandLineBodySchema,
  RestoreConfirmedPackageDemandLineParamsSchema,
} from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class RestoreConfirmedPackageDemandLineParamsDto extends createZodDto(
  RestoreConfirmedPackageDemandLineParamsSchema,
) {}
export class RestoreConfirmedPackageDemandLineRequestDto extends createZodDto(
  RestoreConfirmedPackageDemandLineBodySchema,
) {}

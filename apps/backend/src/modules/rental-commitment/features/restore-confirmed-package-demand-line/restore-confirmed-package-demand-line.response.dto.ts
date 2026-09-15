import { RestoreConfirmedPackageDemandLineResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class RestoreConfirmedPackageDemandLineResponseDto extends createZodDto(
  RestoreConfirmedPackageDemandLineResponseSchema,
) {}

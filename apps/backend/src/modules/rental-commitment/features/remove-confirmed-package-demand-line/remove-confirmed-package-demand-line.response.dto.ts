import { RemoveConfirmedPackageDemandLineResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class RemoveConfirmedPackageDemandLineResponseDto extends createZodDto(
  RemoveConfirmedPackageDemandLineResponseSchema,
) {}

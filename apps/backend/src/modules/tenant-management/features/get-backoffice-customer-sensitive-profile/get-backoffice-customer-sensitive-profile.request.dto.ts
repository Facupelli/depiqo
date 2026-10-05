import { GetBackofficeCustomerSensitiveProfileParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetBackofficeCustomerSensitiveProfileParamsDto extends createZodDto(
  GetBackofficeCustomerSensitiveProfileParamsSchema,
) {}

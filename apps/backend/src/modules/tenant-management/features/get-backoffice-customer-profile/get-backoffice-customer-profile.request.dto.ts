import { GetBackofficeCustomerProfileParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetBackofficeCustomerProfileParamsDto extends createZodDto(GetBackofficeCustomerProfileParamsSchema) {}

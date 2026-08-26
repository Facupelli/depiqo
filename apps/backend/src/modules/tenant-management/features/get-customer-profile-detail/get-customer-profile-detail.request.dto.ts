import { GetCustomerProfileDetailParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetCustomerProfileDetailParamsDto extends createZodDto(GetCustomerProfileDetailParamsSchema) {}

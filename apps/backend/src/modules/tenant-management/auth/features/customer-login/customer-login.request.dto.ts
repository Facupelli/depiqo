import { CustomerLoginBodySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CustomerLoginRequestDto extends createZodDto(CustomerLoginBodySchema) {}

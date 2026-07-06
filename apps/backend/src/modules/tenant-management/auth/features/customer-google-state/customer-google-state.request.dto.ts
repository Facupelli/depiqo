import { CustomerGoogleStateBodySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CustomerGoogleStateRequestDto extends createZodDto(CustomerGoogleStateBodySchema) {}

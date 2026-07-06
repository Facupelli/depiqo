import { CustomerGoogleHandoffBodySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CustomerGoogleLoginRequestDto extends createZodDto(CustomerGoogleHandoffBodySchema) {}

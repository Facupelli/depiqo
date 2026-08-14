import { CustomerGoogleFinalizeBodySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CustomerGoogleFinalizeRequestDto extends createZodDto(CustomerGoogleFinalizeBodySchema) {}

import { SubmitCustomerProfileBodySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export const SubmitCustomerProfileSchema = SubmitCustomerProfileBodySchema;

export class SubmitCustomerProfileRequestDto extends createZodDto(SubmitCustomerProfileSchema) {}

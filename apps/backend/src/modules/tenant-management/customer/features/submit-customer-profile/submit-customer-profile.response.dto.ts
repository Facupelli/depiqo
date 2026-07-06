import { SubmitCustomerProfileResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class SubmitCustomerProfileResponseDto extends createZodDto(SubmitCustomerProfileResponseSchema) {}

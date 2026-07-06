import {
  RejectSubmittedCustomerOnboardingBodySchema,
  RejectSubmittedCustomerOnboardingParamsSchema,
} from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class RejectSubmittedCustomerOnboardingParamsDto extends createZodDto(
  RejectSubmittedCustomerOnboardingParamsSchema,
) {}

export class RejectSubmittedCustomerOnboardingRequestDto extends createZodDto(
  RejectSubmittedCustomerOnboardingBodySchema,
) {}

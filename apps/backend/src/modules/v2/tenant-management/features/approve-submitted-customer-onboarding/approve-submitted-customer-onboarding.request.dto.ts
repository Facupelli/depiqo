import { ApproveSubmittedCustomerOnboardingParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class ApproveSubmittedCustomerOnboardingParamsDto extends createZodDto(
  ApproveSubmittedCustomerOnboardingParamsSchema,
) {}

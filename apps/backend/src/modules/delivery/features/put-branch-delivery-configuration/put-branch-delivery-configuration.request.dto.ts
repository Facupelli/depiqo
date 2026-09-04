import { BranchDeliveryConfigurationParamsSchema, PutBranchDeliveryConfigurationBodySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class PutBranchDeliveryConfigurationParamsDto extends createZodDto(BranchDeliveryConfigurationParamsSchema) {}

export class PutBranchDeliveryConfigurationRequestDto extends createZodDto(PutBranchDeliveryConfigurationBodySchema) {}

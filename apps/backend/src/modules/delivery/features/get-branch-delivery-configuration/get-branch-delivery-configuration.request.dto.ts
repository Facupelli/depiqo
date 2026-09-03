import { BranchDeliveryConfigurationParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetBranchDeliveryConfigurationParamsDto extends createZodDto(BranchDeliveryConfigurationParamsSchema) {}

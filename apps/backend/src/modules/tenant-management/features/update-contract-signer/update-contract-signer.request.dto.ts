import { UpdateContractSignerBodySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdateContractSignerRequestDto extends createZodDto(UpdateContractSignerBodySchema) {}

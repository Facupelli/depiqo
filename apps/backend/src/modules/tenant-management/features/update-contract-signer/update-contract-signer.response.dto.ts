import { UpdateContractSignerResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdateContractSignerResponseDto extends createZodDto(UpdateContractSignerResponseSchema) {}

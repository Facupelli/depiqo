import { CreateContractSignerResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateContractSignerResponseDto extends createZodDto(CreateContractSignerResponseSchema) {}

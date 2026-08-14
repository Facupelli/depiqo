import { CreateOwnerWithContractResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateOwnerWithContractResponseDto extends createZodDto(CreateOwnerWithContractResponseSchema) {}

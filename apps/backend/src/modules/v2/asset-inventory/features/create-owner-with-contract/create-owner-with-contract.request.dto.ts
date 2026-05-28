import { CreateOwnerWithContractBodySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateOwnerWithContractRequestDto extends createZodDto(CreateOwnerWithContractBodySchema) {}

import { CreateContractSignerBodySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateContractSignerRequestDto extends createZodDto(CreateContractSignerBodySchema) {}

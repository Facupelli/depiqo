import { CreateBranchBodySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateBranchRequestDto extends createZodDto(CreateBranchBodySchema) {}

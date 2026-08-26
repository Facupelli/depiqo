import { CreateBranchResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateBranchResponseDto extends createZodDto(CreateBranchResponseSchema) {}

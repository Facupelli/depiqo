import { UpdateBranchResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdateBranchResponseDto extends createZodDto(UpdateBranchResponseSchema) {}

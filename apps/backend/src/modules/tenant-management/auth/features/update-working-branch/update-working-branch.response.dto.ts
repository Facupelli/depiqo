import { UpdateWorkingBranchResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdateWorkingBranchResponseDto extends createZodDto(UpdateWorkingBranchResponseSchema) {}

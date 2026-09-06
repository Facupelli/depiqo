import { UpdateWorkingBranchBodySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdateWorkingBranchRequestDto extends createZodDto(UpdateWorkingBranchBodySchema) {}

import { GetBranchesQuerySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetBranchesRequestDto extends createZodDto(GetBranchesQuerySchema) {}

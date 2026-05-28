import { GetBranchDetailParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetBranchDetailParamsDto extends createZodDto(GetBranchDetailParamsSchema) {}

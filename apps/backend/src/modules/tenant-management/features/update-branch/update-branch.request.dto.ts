import { UpdateBranchBodySchema, UpdateBranchParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdateBranchParamsDto extends createZodDto(UpdateBranchParamsSchema) {}

export class UpdateBranchRequestDto extends createZodDto(UpdateBranchBodySchema) {}

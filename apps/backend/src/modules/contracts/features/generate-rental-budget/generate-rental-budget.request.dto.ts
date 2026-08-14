import { GenerateRentalBudgetBodySchema, GenerateRentalBudgetParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GenerateRentalBudgetParamsDto extends createZodDto(GenerateRentalBudgetParamsSchema) {}
export class GenerateRentalBudgetRequestDto extends createZodDto(GenerateRentalBudgetBodySchema) {}

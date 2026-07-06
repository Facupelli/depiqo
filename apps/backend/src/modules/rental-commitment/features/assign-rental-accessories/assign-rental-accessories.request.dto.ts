import { AssignRentalAccessoriesBodySchema, AssignRentalAccessoriesParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class AssignRentalAccessoriesParamsDto extends createZodDto(AssignRentalAccessoriesParamsSchema) {}

export class AssignRentalAccessoriesRequestDto extends createZodDto(AssignRentalAccessoriesBodySchema) {}

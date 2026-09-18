import { GetRentalOperationsQuerySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetRentalOperationsRequestDto extends createZodDto(GetRentalOperationsQuerySchema) {}

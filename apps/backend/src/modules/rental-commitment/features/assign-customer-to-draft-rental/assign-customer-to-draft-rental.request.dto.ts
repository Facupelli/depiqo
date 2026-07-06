import { AssignCustomerToDraftRentalBodySchema, AssignCustomerToDraftRentalParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class AssignCustomerToDraftRentalParamsDto extends createZodDto(AssignCustomerToDraftRentalParamsSchema) {}

export class AssignCustomerToDraftRentalRequestDto extends createZodDto(AssignCustomerToDraftRentalBodySchema) {}

import { EditUnconfirmedRentalResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class EditUnconfirmedRentalResponseDto extends createZodDto(EditUnconfirmedRentalResponseSchema) {}

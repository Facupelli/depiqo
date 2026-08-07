import { EditConfirmedRentalResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class EditConfirmedRentalResponseDto extends createZodDto(EditConfirmedRentalResponseSchema) {}

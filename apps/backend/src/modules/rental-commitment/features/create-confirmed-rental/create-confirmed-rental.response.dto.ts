import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateConfirmedRentalResponseSchema = z.object({
  id: z.string(),
});

export class CreateConfirmedRentalResponseDto extends createZodDto(CreateConfirmedRentalResponseSchema) {}

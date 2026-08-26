import { CreateRatePlanBodySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateRatePlanRequestDto extends createZodDto(CreateRatePlanBodySchema) {}

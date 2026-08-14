import { GetRatePlansQuerySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetRatePlansRequestDto extends createZodDto(GetRatePlansQuerySchema) {}

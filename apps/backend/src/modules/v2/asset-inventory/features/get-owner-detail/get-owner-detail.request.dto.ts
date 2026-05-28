import { GetOwnerDetailParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetOwnerDetailParamsDto extends createZodDto(GetOwnerDetailParamsSchema) {}

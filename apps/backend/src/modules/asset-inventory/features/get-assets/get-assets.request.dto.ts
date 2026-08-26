import { GetAssetsQuerySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetAssetsRequestDto extends createZodDto(GetAssetsQuerySchema) {}

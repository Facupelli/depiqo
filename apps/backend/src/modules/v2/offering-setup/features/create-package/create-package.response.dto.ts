import { CreatePackageResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CreatePackageResponseDto extends createZodDto(CreatePackageResponseSchema) {}

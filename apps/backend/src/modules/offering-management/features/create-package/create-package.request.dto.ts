import { CreatePackageBodySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CreatePackageRequestDto extends createZodDto(CreatePackageBodySchema) {}

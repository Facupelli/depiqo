import { ChangePasswordBodySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class ChangePasswordRequestDto extends createZodDto(ChangePasswordBodySchema) {}

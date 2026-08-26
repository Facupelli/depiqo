import { RetireAssetParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class RetireAssetParamsDto extends createZodDto(RetireAssetParamsSchema) {}

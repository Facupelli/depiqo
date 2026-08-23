import { ArchiveRentableItemParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class ArchiveRentableItemRequestDto extends createZodDto(ArchiveRentableItemParamsSchema) {}

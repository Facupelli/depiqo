import { RefreshCustomDomainStatusResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class RefreshCustomDomainStatusResponseDto extends createZodDto(RefreshCustomDomainStatusResponseSchema) {}

import { SendSigningInvitationResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class SendSigningInvitationResponseDto extends createZodDto(SendSigningInvitationResponseSchema) {}

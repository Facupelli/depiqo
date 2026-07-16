import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const SendSigningInvitationParamSchema = z.object({
  orderId: z.string().uuid(),
});

export const SendSigningInvitationBodySchema = z.object({
  recipientEmail: z.string().trim().email().optional(),
});

export class SendSigningInvitationBodyDto extends createZodDto(SendSigningInvitationBodySchema) {}

export class SendSigningInvitationParamDto extends createZodDto(SendSigningInvitationParamSchema) {}

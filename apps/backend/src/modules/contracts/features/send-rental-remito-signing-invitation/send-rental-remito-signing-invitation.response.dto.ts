import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const SendRentalRemitoSigningInvitationResponseSchema = z.object({
  requestId: z.string().uuid(),
  documentNumber: z.string().min(1),
  recipientEmail: z.string().email(),
  expiresAt: z.date(),
  documentHash: z.string().min(1),
  reusedExistingRequest: z.boolean(),
});

export class SendRentalRemitoSigningInvitationResponseDto extends createZodDto(
  SendRentalRemitoSigningInvitationResponseSchema,
) {}

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// The shared restore transport contract is introduced with the detail cutover in ticket 09.
export const RestoreRentableItemParamsSchema = z.object({ rentableItemId: z.string().trim().min(1) });

export class RestoreRentableItemRequestDto extends createZodDto(RestoreRentableItemParamsSchema) {}

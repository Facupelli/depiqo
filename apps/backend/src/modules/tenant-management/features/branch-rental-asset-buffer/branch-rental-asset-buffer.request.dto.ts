import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const BranchRentalAssetBufferSchema = z.strictObject({
  beforeBufferMinutes: z.int32().nonnegative(),
  afterBufferMinutes: z.int32().nonnegative(),
});

export class UpdateBranchRentalAssetBufferRequestDto extends createZodDto(BranchRentalAssetBufferSchema) {}

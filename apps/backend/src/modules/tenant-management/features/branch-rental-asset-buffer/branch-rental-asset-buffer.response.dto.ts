import { createZodDto } from 'nestjs-zod';

import { BranchRentalAssetBufferSchema } from './branch-rental-asset-buffer.request.dto';

export class GetBranchRentalAssetBufferResponseDto extends createZodDto(BranchRentalAssetBufferSchema) {}

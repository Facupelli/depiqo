import { DownloadRentalSignedRemitoParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class DownloadRentalSignedRemitoParamsDto extends createZodDto(DownloadRentalSignedRemitoParamsSchema) {}

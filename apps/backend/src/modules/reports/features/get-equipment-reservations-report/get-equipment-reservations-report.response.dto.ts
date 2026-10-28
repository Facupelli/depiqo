import { GetEquipmentReservationsReportResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetEquipmentReservationsReportResponseDto extends createZodDto(
  GetEquipmentReservationsReportResponseSchema,
) {}

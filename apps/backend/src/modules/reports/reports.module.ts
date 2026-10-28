import { Module } from '@nestjs/common';

import { TenantManagementModule } from '../tenant-management/tenant-management.module';
import { GetEquipmentReservationsReportHttpController } from './features/get-equipment-reservations-report/get-equipment-reservations-report.controller';
import { GetEquipmentReservationsReportHandler } from './features/get-equipment-reservations-report/get-equipment-reservations-report.handler';
import { GetRentalOrdersReportHttpController } from './features/get-rental-orders-report/get-rental-orders-report.controller';
import { GetRentalOrdersReportHandler } from './features/get-rental-orders-report/get-rental-orders-report.handler';

@Module({
  imports: [TenantManagementModule],
  controllers: [GetRentalOrdersReportHttpController, GetEquipmentReservationsReportHttpController],
  providers: [GetRentalOrdersReportHandler, GetEquipmentReservationsReportHandler],
})
export class ReportsModule {}

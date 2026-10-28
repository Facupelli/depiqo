import { z } from "zod";

import type { ApiContract } from "../api-contract";
import {
  ReportCountSchema,
  ReportPeriodSchema,
  ReportQuerySchema,
} from "./report.schema";

export const GetEquipmentReservationsReportQuerySchema = ReportQuerySchema;

export const EquipmentReservationsReportItemSchema = z.object({
  equipmentTypeId: z.string().min(1),
  equipmentTypeName: z.string(),
  rentalCount: ReportCountSchema,
  unitDemand: ReportCountSchema,
});

export const GetEquipmentReservationsReportResponseSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12).nullable(),
  period: ReportPeriodSchema,
  data: z.array(EquipmentReservationsReportItemSchema),
  total: ReportCountSchema,
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});

export type GetEquipmentReservationsReportQueryDto = z.infer<
  typeof GetEquipmentReservationsReportQuerySchema
>;
export type EquipmentReservationsReportItemDto = z.infer<
  typeof EquipmentReservationsReportItemSchema
>;
export type GetEquipmentReservationsReportResponseDto = z.infer<
  typeof GetEquipmentReservationsReportResponseSchema
>;

export const getEquipmentReservationsReportContract = {
  method: "GET",
  path: "/reports/equipment",
  query: GetEquipmentReservationsReportQuerySchema,
  response: GetEquipmentReservationsReportResponseSchema,
} satisfies ApiContract<
  undefined,
  typeof GetEquipmentReservationsReportQuerySchema,
  undefined,
  undefined,
  typeof GetEquipmentReservationsReportResponseSchema
>;

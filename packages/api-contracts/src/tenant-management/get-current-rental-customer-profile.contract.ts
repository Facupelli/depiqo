import type { ApiContract } from "../api-contract";
import {
  GetCustomerProfileDetailResponseSchema,
  type GetCustomerProfileDetailResponseDto,
} from "./get-customer-profile-detail.contract";

export const GetCurrentRentalCustomerProfileResponseSchema = GetCustomerProfileDetailResponseSchema;

export type GetCurrentRentalCustomerProfileResponseDto = GetCustomerProfileDetailResponseDto;

export const getCurrentRentalCustomerProfileContract = {
  method: "GET",
  path: "/v2/tenant-management/rental-customers/me/profile",
  response: GetCurrentRentalCustomerProfileResponseSchema,
} satisfies ApiContract<
  undefined,
  undefined,
  undefined,
  undefined,
  typeof GetCurrentRentalCustomerProfileResponseSchema
>;

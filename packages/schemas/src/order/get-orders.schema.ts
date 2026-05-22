import { FulfillmentMethod, OrderStatus } from "@repo/types";
import { paginatedSchema } from "../api/api.schema";
import { z } from "zod";

const orderStatusSchema = z.enum(OrderStatus);

const orderStatusesQuerySchema = z
  .union([
    z.array(orderStatusSchema).min(1),
    z
      .string()
      .transform((value) =>
        value
          .split(",")
          .map((status) => status.trim())
          .filter(Boolean),
      )
      .pipe(z.array(orderStatusSchema).min(1)),
  ])
  .optional();

export const orderListDateLensSchema = z.enum([
  "TODAY",
  "UPCOMING",
  "ACTIVE",
  "PAST",
]);

export const orderListSortBySchema = z.enum([
  "createdAt",
  "pickupDate",
  "returnDate",
]);

export const orderListSortDirectionSchema = z.enum(["asc", "desc"]);

const OrderListCustomerSummarySchema = z.object({
  id: z.uuid(),
  displayName: z.string(),
  isCompany: z.boolean(),
});

const OrderListLocationSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
});

export const orderListItemSchema = z.object({
  id: z.uuid(),
  number: z.number().int(),
  status: orderStatusSchema,
  fulfillmentMethod: z.enum(FulfillmentMethod),
  createdAt: z.date(),
  pickupAt: z.date(),
  returnAt: z.date(),
  customer: OrderListCustomerSummarySchema.nullable(),
  location: OrderListLocationSummarySchema,
});

export const getOrdersQuerySchema = z.object({
  locationId: z.uuid().optional(),
  customerId: z.uuid().optional(),
  statuses: orderStatusesQuerySchema,
  orderNumber: z.coerce.number().int().min(1).optional(),
  dateLens: orderListDateLensSchema.optional(),
  sortBy: orderListSortBySchema.optional(),
  sortDirection: orderListSortDirectionSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const getOrdersResponseSchema = paginatedSchema(orderListItemSchema);

export type OrderListDateLens = z.infer<typeof orderListDateLensSchema>;
export type OrderListSortBy = z.infer<typeof orderListSortBySchema>;
export type OrderListSortDirection = z.infer<
  typeof orderListSortDirectionSchema
>;
export type OrderListItem = z.infer<typeof orderListItemSchema>;
export type GetOrdersQueryDto = z.infer<typeof getOrdersQuerySchema>;
export type GetOrdersResponseDto = z.infer<typeof getOrdersResponseSchema>;

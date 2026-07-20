import { createServerFn } from "@tanstack/react-start";
import { GetRentalDetailViewInputSchema } from "./get-rental-detail-view.schema";
import { getRentalDetailView } from "./get-rental-detail-view.server";

export const getRentalDetailViewFn = createServerFn({ method: "GET" })
	.validator((data) => GetRentalDetailViewInputSchema.parse(data))
	.handler(async ({ data }) => getRentalDetailView(data));

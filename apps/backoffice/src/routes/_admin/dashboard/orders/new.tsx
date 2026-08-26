import { createFileRoute } from "@tanstack/react-router";
import { CreateRentalPage } from "@/modules/rentals/create-rental/CreateRentalPage";

export const Route = createFileRoute("/_admin/dashboard/orders/new")({
	component: CreateRentalPage,
});

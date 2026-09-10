import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute(
	"/_admin/dashboard/catalog/packages/$rentableItemId/",
)({
	beforeLoad: ({ params: { rentableItemId } }) => {
		throw redirect({
			to: "/dashboard/catalog/packages/$rentableItemId/equipment",
			params: { rentableItemId },
			replace: true,
		});
	},
});

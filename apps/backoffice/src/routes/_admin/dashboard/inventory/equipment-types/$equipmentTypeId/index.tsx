import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute(
	"/_admin/dashboard/inventory/equipment-types/$equipmentTypeId/",
)({
	beforeLoad: ({ params: { equipmentTypeId } }) => {
		throw redirect({
			to: "/dashboard/inventory/equipment-types/$equipmentTypeId/units",
			params: { equipmentTypeId },
			replace: true,
		});
	},
});

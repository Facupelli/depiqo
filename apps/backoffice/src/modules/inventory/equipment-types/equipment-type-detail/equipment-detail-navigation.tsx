import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { Link, useRouterState } from "@tanstack/react-router";
import { Boxes, HandCoins, LayoutDashboard } from "lucide-react";

const detailSections = [
	{
		value: "summary",
		label: "Resumen",
		icon: LayoutDashboard,
		to: "/dashboard/inventory/equipment-types/$equipmentTypeId" as const,
		suffix: "",
	},
	{
		value: "units",
		label: "Unidades",
		icon: Boxes,
		to: "/dashboard/inventory/equipment-types/$equipmentTypeId/units" as const,
		suffix: "/units",
	},
	{
		value: "rentals",
		label: "Alquileres",
		icon: HandCoins,
		to: "/dashboard/inventory/equipment-types/$equipmentTypeId/rentals" as const,
		suffix: "/rentals",
	},
] as const;

export function EquipmentDetailNavigation({
	equipmentTypeId,
}: {
	equipmentTypeId: string;
}) {
	const pathname = useRouterState({
		select: ({ location }) => location.pathname.replace(/\/$/, ""),
	});
	const activeSection =
		detailSections.find((section) =>
			section.suffix ? pathname.endsWith(section.suffix) : false,
		)?.value ?? "summary";

	return (
		<Tabs value={activeSection}>
			<TabsList
				variant="line"
				className="h-auto w-full justify-start overflow-x-auto rounded-none border-b bg-transparent p-0"
			>
				{detailSections.map((section) => {
					const Icon = section.icon;
					return (
						<TabsTrigger
							key={section.value}
							value={section.value}
							className="flex-none gap-2 rounded-none px-5 py-3 text-sm"
							render={<Link to={section.to} params={{ equipmentTypeId }} />}
						>
							<Icon className="size-4" />
							{section.label}
						</TabsTrigger>
					);
				})}
			</TabsList>
		</Tabs>
	);
}

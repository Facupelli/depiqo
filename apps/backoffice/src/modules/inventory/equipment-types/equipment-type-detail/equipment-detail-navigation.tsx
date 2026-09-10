import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { Link, useRouterState } from "@tanstack/react-router";
import { Boxes, HandCoins, PackagePlus } from "lucide-react";

const detailSections = [
	{
		value: "units",
		label: "Unidades",
		icon: Boxes,
		to: "/dashboard/inventory/equipment-types/$equipmentTypeId/units" as const,
		suffix: "/units",
	},
	{
		value: "rentals",
		label: "Productos",
		icon: HandCoins,
		to: "/dashboard/inventory/equipment-types/$equipmentTypeId/rentals" as const,
		suffix: "/rentals",
	},
	{
		value: "accessories",
		label: "Accesorios",
		icon: PackagePlus,
		to: "/dashboard/inventory/equipment-types/$equipmentTypeId/accessories" as const,
		suffix: "/accessories",
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
	const activeSection = pathname.includes("/rentals")
		? "rentals"
		: (detailSections.find((section) => pathname.endsWith(section.suffix))
				?.value ?? "units");

	return (
		<Tabs value={activeSection} className="min-w-0 gap-0">
			<TabsList
				variant="line"
				className="group-data-horizontal/tabs:h-12 w-full justify-start overflow-x-auto overflow-y-hidden rounded-none border-b bg-transparent p-0"
			>
				{detailSections.map((section) => {
					const Icon = section.icon;
					return (
						<TabsTrigger
							key={section.value}
							value={section.value}
							nativeButton={false}
							className="h-full shrink-0 flex-none gap-2 px-4 py-0 whitespace-nowrap after:bottom-0"
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

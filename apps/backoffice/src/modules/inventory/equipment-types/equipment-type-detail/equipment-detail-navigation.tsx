import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { Link } from "@tanstack/react-router";
import { LayoutDashboard } from "lucide-react";

const detailSections = [
	{
		value: "summary",
		label: "Resumen",
		icon: LayoutDashboard,
		to: "/dashboard/inventory/equipment-types/$equipmentTypeId" as const,
	},
];

export function EquipmentDetailNavigation({
	equipmentTypeId,
}: {
	equipmentTypeId: string;
}) {
	return (
		<Tabs value="summary">
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

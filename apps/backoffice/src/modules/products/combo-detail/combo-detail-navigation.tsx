import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { Link, useRouterState } from "@tanstack/react-router";
import { HandCoins, LayoutDashboard, PackageOpen } from "lucide-react";

const sections = [
	{
		value: "summary",
		label: "Resumen",
		icon: LayoutDashboard,
		to: "/dashboard/catalog/packages/$rentableItemId" as const,
		suffix: "",
	},
	{
		value: "equipment",
		label: "Equipos",
		icon: PackageOpen,
		to: "/dashboard/catalog/packages/$rentableItemId/equipment" as const,
		suffix: "/equipment",
	},
	{
		value: "rental",
		label: "Alquiler",
		icon: HandCoins,
		to: "/dashboard/catalog/packages/$rentableItemId/rental" as const,
		suffix: "/rental",
	},
] as const;
export function ComboDetailNavigation({
	rentableItemId,
}: {
	rentableItemId: string;
}) {
	const pathname = useRouterState({
		select: ({ location }) => location.pathname.replace(/\/$/, ""),
	});
	const active =
		sections.find(
			(section) => section.suffix && pathname.endsWith(section.suffix),
		)?.value ?? "summary";
	return (
		<Tabs value={active}>
			<TabsList
				variant="line"
				className="h-auto w-full justify-start overflow-x-auto rounded-none border-b bg-transparent p-0"
			>
				{sections.map(({ icon: Icon, ...section }) => (
					<TabsTrigger
						key={section.value}
						value={section.value}
						className="flex-none gap-2 rounded-none px-5 py-3 text-sm"
						render={<Link to={section.to} params={{ rentableItemId }} />}
					>
						<Icon className="size-4" />
						{section.label}
					</TabsTrigger>
				))}
			</TabsList>
		</Tabs>
	);
}

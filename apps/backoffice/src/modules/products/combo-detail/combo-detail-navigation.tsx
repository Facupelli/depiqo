import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { Link, useRouterState } from "@tanstack/react-router";
import { Building2, PackageOpen } from "lucide-react";

const sections = [
	{
		value: "equipment",
		label: "Equipos",
		icon: PackageOpen,
		to: "/dashboard/catalog/packages/$rentableItemId/equipment" as const,
		suffix: "/equipment",
	},
	{
		value: "rental",
		label: "Sucursales",
		icon: Building2,
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
	const active = pathname.endsWith("/rental") ? "rental" : "equipment";
	return (
		<Tabs value={active} className="min-w-0 gap-0">
			<TabsList
				variant="line"
				className="group-data-horizontal/tabs:h-12 w-full justify-start overflow-x-auto overflow-y-hidden rounded-none border-b bg-transparent p-0"
			>
				{sections.map(({ icon: Icon, ...section }) => (
					<TabsTrigger
						key={section.value}
						value={section.value}
						nativeButton={false}
						className="h-full shrink-0 flex-none gap-2 px-4 py-0 whitespace-nowrap after:bottom-0"
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

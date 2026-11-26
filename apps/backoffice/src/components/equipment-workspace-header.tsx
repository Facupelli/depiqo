import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@repo/ui/components/breadcrumb";
import { Button } from "@repo/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Link, useRouteContext } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { equipmentDestinations } from "./dashboard-navigation";

export function EquipmentWorkspaceHeader({
	current,
	actions,
}: {
	current: string;
	actions?: ReactNode;
}) {
	const { user } = useRouteContext({ from: "/_admin/dashboard" });
	const destinations = equipmentDestinations.filter((item) =>
		item.isVisible(user.permissions),
	);
	const parent = destinations[0];
	const menuItems = destinations.filter((item) => "menuIcon" in item);
	return (
		<div className="flex flex-wrap items-center justify-between gap-3">
			<div className="space-y-2">
				{current !== "Equipos" ? (
					<Breadcrumb>
						<BreadcrumbList>
							<BreadcrumbItem>
								{parent && parent.name !== current ? (
									<BreadcrumbLink
										render={<Link to={parent.href}>Equipos</Link>}
									/>
								) : (
									<span>Equipos</span>
								)}
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbPage>{current}</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
				) : null}
				<h1 className="text-xl font-semibold tracking-tight">{current}</h1>
			</div>
			<div className="flex flex-wrap items-center gap-2">
				{menuItems.length > 0 ? (
					<DropdownMenu>
						<DropdownMenuTrigger render={<Button variant="outline" />}>
							Gestionar <ChevronDown className="size-4" />
						</DropdownMenuTrigger>
						<DropdownMenuContent
							align="end"
							className="min-w-[min(13rem,var(--available-width))] max-w-(--available-width)"
						>
							{menuItems.map((item) => (
								<DropdownMenuItem
									key={item.href}
									className="min-h-11 gap-2.5 px-3 whitespace-nowrap"
									render={<Link to={item.href} />}
								>
									<item.menuIcon aria-hidden="true" className="size-4" />
									<span className="truncate">{item.name}</span>
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				) : null}
				{actions}
			</div>
		</div>
	);
}

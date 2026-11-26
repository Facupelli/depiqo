import {
	type TenantPermission as Permission,
	TenantPermission,
} from "@repo/api-contracts";
import {
	BadgePercent,
	BarChart3,
	CalendarDays,
	CalendarRange,
	Camera,
	ChartNoAxesCombined,
	LayoutGrid,
	type LucideIcon,
	Settings,
	ShoppingBag,
	Tags,
	Users,
} from "lucide-react";
import {
	categoryWorkspacePermissions,
	customerListPermissions,
	inventoryReadPermissions,
	inventoryWorkspacePermissions,
	productWorkspacePermissions,
	promotionListPermissions,
	rentalWorkspacePermissions,
	settingsPermissions,
} from "@/auth/capabilities";
import { can, canAny } from "@/auth/permissions";

export const equipmentDestinations = [
	{
		name: "Equipos",
		href: "/dashboard/inventory/equipment-types",
		isVisible: (permissions: readonly Permission[]) =>
			canAny(permissions, inventoryWorkspacePermissions),
	},
	{
		name: "Combos",
		href: "/dashboard/catalog/packages",
		isVisible: (permissions: readonly Permission[]) =>
			canAny(permissions, productWorkspacePermissions),
	},
	{
		name: "Disponibilidad",
		href: "/dashboard/inventory/unit-availability",
		menuIcon: CalendarRange,
		isVisible: (permissions: readonly Permission[]) =>
			canAny(permissions, inventoryReadPermissions),
	},
	{
		name: "Categorías",
		href: "/dashboard/catalog/categories",
		menuIcon: Tags,
		isVisible: (permissions: readonly Permission[]) =>
			canAny(permissions, categoryWorkspacePermissions),
	},
	{
		name: "Dueños de Equipo",
		href: "/dashboard/owners",
		menuIcon: Users,
		isVisible: (permissions: readonly Permission[]) =>
			canAny(permissions, inventoryWorkspacePermissions),
	},
] as const;

export const customerDestinations = [
	{
		name: "Clientes",
		href: "/dashboard/customers",
		isVisible: (permissions: readonly Permission[]) =>
			canAny(permissions, customerListPermissions),
	},
	{
		name: "Solicitudes de alta",
		href: "/dashboard/customers/pending-profiles",
		isVisible: (permissions: readonly Permission[]) =>
			can(permissions, TenantPermission.CustomersOnboardingManage),
	},
];

export const reportDestinations = [
	{
		name: "Alquileres",
		href: "/dashboard/reports/rentals",
		isVisible: (permissions: readonly Permission[]) =>
			can(permissions, TenantPermission.ReportsRentalsRead),
	},
	{
		name: "Equipos más reservados",
		href: "/dashboard/reports/equipment",
		isVisible: (permissions: readonly Permission[]) =>
			can(permissions, TenantPermission.ReportsEquipmentRead),
	},
];

export function matchesNavigationPath(pathname: string, href: string) {
	return pathname === href || pathname.startsWith(`${href}/`);
}

type DashboardNavItem = {
	name: string;
	icon: LucideIcon;
	href: string;
	visible: boolean;
	paths?: string[];
	children?: { name: string; href: string }[];
};

export function getDashboardNavigation(permissions: readonly Permission[]) {
	const equipment = equipmentDestinations.filter((item) =>
		item.isVisible(permissions),
	);
	const customers = customerDestinations.filter((item) =>
		item.isVisible(permissions),
	);
	const reports = reportDestinations.filter((item) =>
		item.isVisible(permissions),
	);
	const combos = equipment.find(
		(item) => item.href === "/dashboard/catalog/packages",
	);
	const groups: DashboardNavItem[][] = [
		[
			{
				name: "Inicio",
				icon: LayoutGrid,
				href: "/dashboard",
				paths: [],
				visible: can(permissions, TenantPermission.RentalsRead),
			},
			{
				name: "Calendario",
				icon: CalendarDays,
				href: "/dashboard/calendar",
				visible: can(permissions, TenantPermission.RentalsRead),
			},
			{
				name: "Alquileres",
				icon: ShoppingBag,
				href: "/dashboard/orders",
				visible: canAny(permissions, rentalWorkspacePermissions),
			},
			{
				name: "Clientes",
				icon: Users,
				href: customers[0]?.href ?? "/dashboard/customers",
				paths: ["/dashboard/customers"],
				visible: customers.length > 0,
			},
		],
		[
			{
				name: "Equipos",
				icon: Camera,
				href: equipment[0]?.href ?? equipmentDestinations[0].href,
				paths: [
					...equipmentDestinations.map((item) => item.href),
					"/dashboard/catalog",
				],
				visible: equipment.length > 0,
				children: combos ? [combos] : [],
			},
			{
				name: "Promociones",
				icon: BadgePercent,
				href: "/dashboard/promotions",
				visible: canAny(permissions, promotionListPermissions),
			},
		],
		[
			{
				name: "Finanzas",
				icon: BarChart3,
				href: "/dashboard/finances",
				visible: can(permissions, TenantPermission.FinancesRead),
			},
			{
				name: "Reportes",
				icon: ChartNoAxesCombined,
				href: reports[0]?.href ?? "/dashboard/reports",
				paths: ["/dashboard/reports"],
				visible: reports.length > 0,
			},
		],
		[
			{
				name: "Ajustes",
				icon: Settings,
				href: "/dashboard/settings",
				visible: canAny(permissions, settingsPermissions),
			},
		],
	];
	return groups.map((group) => group.filter((item) => item.visible));
}

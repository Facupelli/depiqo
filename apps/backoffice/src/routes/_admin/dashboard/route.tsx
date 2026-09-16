import {
	TenantPermission,
	type TenantPermission as TenantPermissionId,
} from "@repo/api-contracts";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@repo/ui/components/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { cn } from "@repo/ui/lib/utils";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
	useNavigate,
	useRouterState,
} from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
	BadgePercent,
	CalendarDays,
	Camera,
	ChevronsUpDown,
	LogOut,
	Settings,
	ShoppingBag,
	User,
	Users,
} from "lucide-react";
import { currentBusinessQueries } from "@/application/current-business/current-business.queries";
import { currentAuthQueries } from "@/auth/auth.queries";
import {
	categoryWorkspacePermissions,
	customerListPermissions,
	inventoryWorkspacePermissions,
	productWorkspacePermissions,
	promotionListPermissions,
	rentalWorkspacePermissions,
} from "@/auth/capabilities";
import { useLogout } from "@/auth/logout/logout.mutation";
import { can, canAny } from "@/auth/permissions";
import { useUpdateWorkingBranch } from "@/auth/update-working-branch/update-working-branch.mutation";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarProvider,
	SidebarTrigger,
	useSidebar,
} from "@/components/ui/sidebar";
import { branchQueries } from "@/modules/settings/branches/public";
import { AdminRouteError } from "@/shared/components/admin-route-error";

export const Route = createFileRoute("/_admin/dashboard")({
	beforeLoad: ({ context, location }) => {
		if (context.user.mustChangePassword) {
			const redirectTo = `${location.pathname}${location.searchStr ?? ""}${location.hash ?? ""}`;
			throw redirect({
				to: "/change-password",
				search: { redirectTo },
			});
		}
	},
	loader: async ({ context: { queryClient } }) => {
		await Promise.all([
			queryClient.ensureQueryData(branchQueries.list()),
			queryClient.ensureQueryData(currentBusinessQueries.current()),
			// queryClient.ensureQueryData(tenantQueries.me()),
		]);
	},
	errorComponent: ({ error }) => <AdminRouteError error={error} />,
	component: DashboardLayout,
});

type PermissionPredicate = (
	permissions: readonly TenantPermissionId[],
) => boolean;

type SidebarChild = {
	name: string;
	href: string;
	isVisible: PermissionPredicate;
};

type SidebarItem = {
	name: string;
	icon: LucideIcon;
	href: string;
	matchDescendants?: boolean;
	isVisible?: PermissionPredicate;
	children?: SidebarChild[];
};

const sidebarItems: SidebarItem[] = [
	// { name: "Inicio", icon: LayoutGrid, href: "/dashboard" },
	{
		name: "Calendario",
		icon: CalendarDays,
		href: "/dashboard/calendar",
		isVisible: (permissions) => can(permissions, TenantPermission.RentalsRead),
	},
	{
		name: "Alquileres",
		icon: ShoppingBag,
		href: "/dashboard/orders",
		isVisible: (permissions) => canAny(permissions, rentalWorkspacePermissions),
		// children: [
		// 	{
		// 		name: "Pendientes de revisión",
		// 		href: "/dashboard/orders/pending-review",
		// 	},
		// ],
	},
	{
		name: "Equipos",
		icon: Camera,
		href: "/dashboard/inventory/equipment-types",
		matchDescendants: true,
		isVisible: (permissions) =>
			canAny(permissions, inventoryWorkspacePermissions),
		children: [
			{
				name: "Combos",
				href: "/dashboard/catalog/packages",
				isVisible: (permissions) =>
					canAny(permissions, productWorkspacePermissions),
			},
			{
				name: "Categorías",
				href: "/dashboard/catalog/categories",
				isVisible: (permissions) =>
					canAny(permissions, categoryWorkspacePermissions),
			},
			{
				name: "Dueños de Equipo",
				href: "/dashboard/owners",
				isVisible: (permissions) =>
					canAny(permissions, inventoryWorkspacePermissions),
			},
		],
	},
	{
		name: "Clientes",
		icon: Users,
		href: "/dashboard/customers",
		isVisible: (permissions) => canAny(permissions, customerListPermissions),
		children: [
			{
				name: "Altas de cliente",
				href: "/dashboard/customers/pending-profiles",
				isVisible: (permissions) =>
					can(permissions, TenantPermission.CustomersOnboardingManage),
			},
		],
	},
	{
		name: "Promociones",
		icon: BadgePercent,
		href: "/dashboard/promotions",
		isVisible: (permissions) => canAny(permissions, promotionListPermissions),
	},
	{
		name: "Ajustes",
		icon: Settings,
		href: "/dashboard/settings",
		children: [
			{
				name: "Negocio",
				href: "/dashboard/settings/business",
				isVisible: (permissions) =>
					can(permissions, TenantPermission.TenantSettingsManage),
			},
			{
				name: "Sucursales",
				href: "/dashboard/settings/branches",
				isVisible: (permissions) =>
					can(permissions, TenantPermission.BranchesManage),
			},
			{
				name: "Tienda online",
				href: "/dashboard/settings/storefront",
				isVisible: (permissions) =>
					can(permissions, TenantPermission.TenantStorefrontManage),
			},
			{
				name: "Políticas de alquiler",
				href: "/dashboard/settings/rental-policies",
				isVisible: (permissions) =>
					can(permissions, TenantPermission.TenantSettingsManage),
			},
			{
				name: "Comunicación con clientes",
				href: "/dashboard/settings/customer-communication",
				isVisible: (permissions) =>
					can(permissions, TenantPermission.TenantSettingsManage),
			},
			{
				name: "Contratos",
				href: "/dashboard/settings/contracts",
				isVisible: (permissions) =>
					can(permissions, TenantPermission.TenantContractSignerManage),
			},
		],
	},
];

function DashboardLayout() {
	const { user } = Route.useRouteContext();
	const { data: business } = useSuspenseQuery(currentBusinessQueries.current());
	const { data: branches } = useSuspenseQuery(branchQueries.list());

	const branchSelectorData = branches.map((branch) => ({
		name: branch.name,
		id: branch.id,
	}));

	return (
		<SidebarProvider>
			<Sidebar
				collapsible="offcanvas"
				className="border-neutral-200 bg-neutral-900 text-white"
			>
				<SidebarHeader className="gap-0 p-4">
					<p className="flex min-h-11 items-center pr-11 font-bold wrap-anywhere lg:min-h-0 lg:pr-0">
						{business.name}
					</p>
					<div className="pt-6 pb-2">
						<BranchSelector
							branches={branchSelectorData}
							className="border-white/15 text-neutral-200"
						/>
					</div>
				</SidebarHeader>
				<SidebarContent className="px-4">
					<DashboardNavigation />
				</SidebarContent>
				<SidebarFooter className="p-4">
					<UserPopover name={user.name} email={user.email} />
				</SidebarFooter>
			</Sidebar>

			<div className="min-w-0 flex-1 bg-gray-50">
				<header className="sticky top-0 z-30 flex items-center gap-2 border-b border-neutral-200 bg-white px-3 py-2 lg:hidden">
					<SidebarTrigger />
					<div className="min-w-0 flex-1">
						<BranchSelector branches={branchSelectorData} />
					</div>
				</header>
				<div className="space-y-4 p-4 lg:p-6">
					<Outlet />
				</div>
			</div>
		</SidebarProvider>
	);
}

function DashboardNavigation() {
	const { user } = Route.useRouteContext();
	const { setOpenMobile } = useSidebar();
	const visibleItems = sidebarItems.flatMap((item) => {
		const children = item.children?.filter((child) =>
			child.isVisible(user.permissions),
		);
		const canOpenDirectTarget = item.isVisible?.(user.permissions) ?? false;

		if (!canOpenDirectTarget && !children?.length) {
			return [];
		}

		return [
			{
				...item,
				href: canOpenDirectTarget
					? item.href
					: (children?.[0]?.href ?? item.href),
				children,
			},
		];
	});

	function closeNavigation() {
		setOpenMobile(false);
	}

	return (
		<nav aria-label="Navegación principal">
			<SidebarMenu>
				{visibleItems.map((item) => {
					const Icon = item.icon;
					return (
						<SidebarMenuItem key={item.href}>
							<SidebarMenuButton
								className="text-neutral-400 hover:bg-white/5 hover:text-white aria-[current=page]:bg-white/10 aria-[current=page]:text-white"
								render={
									<Link
										to={item.href}
										activeOptions={{
											exact: !item.matchDescendants,
											includeSearch: false,
										}}
										preload={false}
										onClick={closeNavigation}
									/>
								}
							>
								<Icon />
								{item.name}
							</SidebarMenuButton>
							{item.children ? (
								<SidebarMenuSub className="border-white/10">
									{item.children.map((child) => (
										<SidebarMenuSubItem key={child.href}>
											<SidebarMenuSubButton
												className="text-neutral-400 hover:text-neutral-300 aria-[current=page]:font-medium aria-[current=page]:text-white"
												render={
													<Link
														to={child.href}
														activeOptions={{ exact: true }}
														onClick={closeNavigation}
													/>
												}
											>
												{child.name}
											</SidebarMenuSubButton>
										</SidebarMenuSubItem>
									))}
								</SidebarMenuSub>
							) : null}
						</SidebarMenuItem>
					);
				})}
			</SidebarMenu>
		</nav>
	);
}

const ALL_BRANCHES_VALUE = "all-branches";

function BranchSelector({
	branches,
	className,
}: {
	branches: { name: string; id: string }[];
	className?: string;
}) {
	const { data: currentAuth } = useSuspenseQuery(currentAuthQueries.current());
	const updateWorkingBranch = useUpdateWorkingBranch();
	const navigate = useNavigate();
	const navigateCombos = useNavigate({
		from: "/dashboard/catalog/packages/",
	});
	const location = useRouterState({ select: (state) => state.location });
	const currentPathname = location.pathname.replace(/\/$/, "");
	const selectedBranch = branches.find(
		(branch) => branch.id === currentAuth.workingBranchId,
	);

	if (branches.length === 1) {
		return (
			<div
				className={cn(
					"flex min-h-11 min-w-0 items-center rounded-md border px-3 py-2 text-sm lg:min-h-9 pointer-coarse:min-h-11",
					className,
				)}
			>
				<span className="truncate">{branches[0].name}</span>
			</div>
		);
	}

	async function handleWorkingBranchChange(value: string | null) {
		if (!value) {
			return;
		}

		await updateWorkingBranch.mutateAsync({
			workingBranchId: value === ALL_BRANCHES_VALUE ? null : value,
		});

		switch (currentPathname) {
			case "/dashboard/calendar":
				if (typeof location.search.branchId === "string") {
					await navigate({
						to: "/dashboard/calendar",
						search: (previous) => ({ ...previous, branchId: undefined }),
						replace: true,
					});
				}
				break;
			case "/dashboard/orders":
			case "/dashboard/inventory/equipment-types":
				if (
					typeof location.search.branchId === "string" ||
					location.search.branchScope === "all"
				) {
					await navigate({
						to: currentPathname,
						search: (previous) => ({
							...previous,
							branchId: undefined,
							branchScope: undefined,
						}),
						replace: true,
					});
				}
				break;
			case "/dashboard/catalog/packages":
				if (
					typeof location.search.branchId === "string" ||
					location.search.branchScope === "all"
				) {
					await navigateCombos({
						search: (previous) => ({
							...previous,
							branchId: undefined,
							branchScope: undefined,
						}),
						replace: true,
					});
				}
				break;
		}
	}

	const items = [
		{ label: "Todas las sucursales", value: ALL_BRANCHES_VALUE },
		...branches.map((branch) => ({ label: branch.name, value: branch.id })),
	];

	return (
		<Select
			value={selectedBranch?.id ?? ALL_BRANCHES_VALUE}
			onValueChange={handleWorkingBranchChange}
			items={items}
			disabled={updateWorkingBranch.isPending}
		>
			<SelectTrigger
				aria-label="Sucursal de trabajo"
				className={cn(
					"min-h-11 w-full min-w-0 bg-transparent lg:min-h-9 pointer-coarse:min-h-11 *:data-[slot=select-value]:block *:data-[slot=select-value]:line-clamp-none",
					className,
				)}
			>
				<SelectValue className="min-w-0 truncate" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem
					value={ALL_BRANCHES_VALUE}
					className="min-h-11 lg:min-h-8 pointer-coarse:min-h-11"
				>
					Todas las sucursales
				</SelectItem>
				{branches.map((branch) => (
					<SelectItem
						key={branch.id}
						value={branch.id}
						className="min-h-11 lg:min-h-8 pointer-coarse:min-h-11"
					>
						{branch.name}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

function UserPopover({ name, email }: { name: string | null; email: string }) {
	const { mutateAsync: logOut } = useLogout();

	return (
		<Popover>
			<PopoverTrigger
				render={
					<button
						type="button"
						className="flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-neutral-800"
					>
						<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-600">
							<User className="h-4 w-4 text-neutral-300" />
						</div>
						<div className="min-w-0 flex-1">
							{name !== null && (
								<p className="truncate text-sm font-medium text-white">
									{name}
								</p>
							)}
							<p className="truncate text-xs text-neutral-400">{email}</p>
						</div>
						<ChevronsUpDown className="h-4 w-4 shrink-0 text-neutral-400" />
					</button>
				}
			/>
			<PopoverContent side="top" align="start" className="w-62 p-1">
				<button
					type="button"
					onClick={async () => {
						await logOut();
					}}
					className="flex min-h-11 w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 lg:min-h-9 pointer-coarse:min-h-11"
				>
					<LogOut className="h-4 w-4" />
					Salir
				</button>
			</PopoverContent>
		</Popover>
	);
}

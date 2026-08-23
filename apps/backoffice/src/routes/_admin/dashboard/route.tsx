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
import { useSuspenseQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	notFound,
	Outlet,
	redirect,
} from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
	BadgePercent,
	BookOpen,
	CalendarDays,
	ChevronsUpDown,
	LogOut,
	Settings,
	ShoppingBag,
	User,
	Users,
	Warehouse,
} from "lucide-react";
import { CurrentBranchProvider } from "@/application/current-branch/current-branch.context";
import {
	useCurrentBranchActions,
	useCurrentBranchId,
} from "@/application/current-branch/current-branch.hooks";
import { currentBusinessQueries } from "@/application/current-business/current-business.queries";
import { useLogout } from "@/auth/logout/logout.mutation";
import { branchQueries } from "@/modules/settings/branches/public";

export const Route = createFileRoute("/_admin/dashboard")({
	beforeLoad: async ({ context, location }) => {
		const redirectTo = `${location.pathname}${location.searchStr ?? ""}${location.hash ?? ""}`;

		if (!context.user) {
			throw redirect({
				to: "/login",
				search: { redirectTo },
			});
		}

		if (context.user.actorType !== "TENANT_USER") {
			throw notFound();
		}

		return {
			user: context.user,
		};
	},
	loader: async ({ context: { queryClient } }) => {
		await Promise.all([
			queryClient.ensureQueryData(branchQueries.list()),
			queryClient.ensureQueryData(currentBusinessQueries.current()),
			// queryClient.ensureQueryData(tenantQueries.me()),
		]);
	},
	component: DashboardLayout,
});

type SidebarItem = {
	name: string;
	icon: LucideIcon;
	href: string;
	children?: Array<{
		name: string;
		href: string;
	}>;
};

const sidebarItems: SidebarItem[] = [
	// { name: "Inicio", icon: LayoutGrid, href: "/dashboard" },
	{
		name: "Calendario",
		icon: CalendarDays,
		href: "/dashboard/calendar",
	},
	{
		name: "Alquileres",
		icon: ShoppingBag,
		href: "/dashboard/orders",
		// children: [
		// 	{
		// 		name: "Pendientes de revisión",
		// 		href: "/dashboard/orders/pending-review",
		// 	},
		// ],
	},
	{
		name: "Catálogo",
		icon: BookOpen,
		href: "/dashboard/catalog",
		children: [{ name: "Categorías", href: "/dashboard/catalog/categories" }],
	},
	{
		name: "Inventario",
		icon: Warehouse,
		href: "/dashboard/inventory/equipment-types",
		children: [{ name: "Dueños de Equipo", href: "/dashboard/owners" }],
	},
	{
		name: "Clientes",
		icon: Users,
		href: "/dashboard/customers",
		children: [
			{
				name: "Altas de cliente",
				href: "/dashboard/customers/pending-profiles",
			},
		],
	},
	{ name: "Promociones", icon: BadgePercent, href: "/dashboard/promotions" },
	{ name: "Ajustes", icon: Settings, href: "/dashboard/settings" },
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
		<CurrentBranchProvider branches={branches}>
			<div className="grid h-full grid-cols-[280px_1fr]">
				<aside className="sticky top-0 flex h-svh flex-col border-r border-gray-200 bg-neutral-900 p-4 text-white overflow-y-auto">
					{/* Tenant header */}
					<div>
						<p className="font-bold">{business.name}</p>
					</div>

					{/* Branch selector */}
					<div className="py-6">
						<BranchSelector branches={branchSelectorData} />
					</div>

					{/* Nav links */}
					<nav className="flex flex-col gap-y-0.5 overflow-y-auto">
						{sidebarItems.map((item) => {
							const Icon = item.icon;

							return (
								<div key={item.name}>
									<Link
										to={item.href}
										className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-neutral-400 transition-colors hover:bg-white/5 hover:text-white"
										activeProps={{
											className:
												"flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium bg-white/10 text-white transition-colors",
										}}
										activeOptions={{ exact: true, includeSearch: false }}
										preload={false}
									>
										<Icon className="h-4 w-4 shrink-0" />
										{item.name}
									</Link>

									{item.children ? (
										<div className="ml-5 mt-0.5 border-l border-white/10 pl-3">
											{item.children.map((child) => (
												<Link
													key={child.href}
													to={child.href}
													activeOptions={{ exact: true }}
													className="block py-1 text-sm text-neutral-400 transition-colors hover:text-neutral-300"
													activeProps={{
														className:
															"block py-1 text-sm font-medium text-white transition-colors",
													}}
												>
													{child.name}
												</Link>
											))}
										</div>
									) : null}
								</div>
							);
						})}
					</nav>

					{/* Profile popover — pinned to bottom via mt-auto */}
					<div className="mt-auto">
						<UserPopover name={user.name} email={user.email} />
					</div>
				</aside>

				<div className="h-full overflow-y-auto bg-gray-50">
					<Outlet />
				</div>
			</div>
		</CurrentBranchProvider>
	);
}

function BranchSelector({
	branches,
}: {
	branches: { name: string; id: string }[];
}) {
	const branchId = useCurrentBranchId();
	const { setCurrentBranch } = useCurrentBranchActions();

	return (
		<Select
			value={branchId ?? ""}
			onValueChange={(value) => value && setCurrentBranch(value)}
			items={branches.map((branch) => ({
				label: branch.name,
				value: branch.id,
			}))}
		>
			<SelectTrigger className="w-full bg-transparent">
				<SelectValue placeholder="Select a branch" />
			</SelectTrigger>
			<SelectContent>
				{branches.map((branch) => (
					<SelectItem key={branch.id} value={branch.id}>
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
					className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
				>
					<LogOut className="h-4 w-4" />
					Salir
				</button>
			</PopoverContent>
		</Popover>
	);
}

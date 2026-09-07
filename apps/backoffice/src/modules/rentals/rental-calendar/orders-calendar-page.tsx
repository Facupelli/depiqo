import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { currentAuthQueries } from "@/auth/auth.queries";
import { useRentalsCalendar } from "@/modules/rentals/rental.queries";
import { useBranches } from "@/modules/settings/branches/public";
import { useBranchTimezone } from "@/shared/timezone/operational-timezone.hooks";
import { OrdersCalendar } from "./orders-calendar";
import {
	DEFAULT_ORDERS_CALENDAR_VIEW,
	getDefaultOrdersCalendarDate,
	type OrdersCalendarRange,
	type OrdersCalendarSearch,
} from "./orders-calendar.utils";

const INHERIT_GLOBAL_BRANCH_VALUE = "inherit-global-branch";

type OrdersCalendarPageProps = {
	search: OrdersCalendarSearch;
	onSearchChange: (search: OrdersCalendarSearch, replace?: boolean) => void;
};

export function OrdersCalendarPage({
	search,
	onSearchChange,
}: OrdersCalendarPageProps) {
	const navigate = useNavigate();
	const { data: currentAuth } = useSuspenseQuery(currentAuthQueries.current());
	const { data: branches = [] } = useBranches();
	const soleBranch = branches.length === 1 ? branches[0] : null;
	const effectiveBranchId =
		soleBranch?.id ?? search.branchId ?? currentAuth.workingBranchId;
	const timezone = useBranchTimezone(effectiveBranchId);
	const currentView = search.view ?? DEFAULT_ORDERS_CALENDAR_VIEW;
	const currentDate = search.date ?? getDefaultOrdersCalendarDate(timezone);
	const [visibleRange, setVisibleRange] = useState<OrdersCalendarRange | null>(
		null,
	);
	const calendarInput =
		effectiveBranchId && visibleRange
			? {
					branchId: effectiveBranchId,
					from: visibleRange.from,
					to: visibleRange.to,
				}
			: undefined;
	const { data, isPending, isFetching, isError } =
		useRentalsCalendar(calendarInput);

	function handleRangeChange(nextRange: OrdersCalendarRange) {
		setVisibleRange(nextRange);

		if (currentView === nextRange.view && currentDate === nextRange.date) {
			return;
		}

		onSearchChange(
			{
				view: nextRange.view,
				date: nextRange.date,
				branchId: search.branchId,
			},
			!search.view || !search.date,
		);
	}

	function handleBranchChange(value: string | null) {
		if (!value) {
			return;
		}

		onSearchChange({
			...search,
			branchId: value === INHERIT_GLOBAL_BRANCH_VALUE ? undefined : value,
		});
	}

	const globalBranch = branches.find(
		(branch) => branch.id === currentAuth.workingBranchId,
	);
	const inheritedScopeLabel = globalBranch?.name ?? "Todas las sucursales";

	return (
		<div className="@container/calendar-page space-y-4">
			{branches.length > 1 && (
				<Select
					value={search.branchId ?? INHERIT_GLOBAL_BRANCH_VALUE}
					onValueChange={handleBranchChange}
					items={[
						{
							label: `Global: ${inheritedScopeLabel}`,
							value: INHERIT_GLOBAL_BRANCH_VALUE,
						},
						...branches.map((branch) => ({
							label: branch.name,
							value: branch.id,
						})),
					]}
				>
					<SelectTrigger className="w-full bg-white @sm/calendar-page:w-64">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={INHERIT_GLOBAL_BRANCH_VALUE}>
							Global: {inheritedScopeLabel}
						</SelectItem>
						{branches.map((branch) => (
							<SelectItem key={branch.id} value={branch.id}>
								{branch.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			)}

			{effectiveBranchId ? (
				<OrdersCalendar
					currentDate={currentDate}
					currentView={currentView}
					timezone={timezone}
					orders={data ?? []}
					isLoading={isPending && !visibleRange}
					isFetching={isFetching}
					isError={isError}
					onRangeChange={handleRangeChange}
					onOrderClick={(orderId) =>
						navigate({
							to: "/dashboard/orders/$orderId",
							params: { orderId },
						})
					}
				/>
			) : (
				// TODO: Support all-branches Calendar through a backend Calendar capability, not frontend query fan-out.
				<div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
					Selecciona una sucursal para ver el calendario.
				</div>
			)}
		</div>
	);
}

import type { RentalOperationSummaryDto } from "@repo/api-contracts";
import { Link } from "@tanstack/react-router";
import { formatTimestampInTimezone } from "@/lib/dates/format";
import { formatOrderNumber } from "@/shared/utils/formatters";

type RentalOperationRowProps = {
	operation: RentalOperationSummaryDto;
	timezone: string;
	isSingleDay: boolean;
};

export function RentalOperationRow({
	operation,
	timezone,
	isSingleDay,
}: RentalOperationRowProps) {
	const time = formatTimestampInTimezone(
		operation.scheduledAt,
		timezone,
		"HH:mm",
	);
	const date = isSingleDay
		? null
		: formatTimestampInTimezone(operation.scheduledAt, timezone, "DD MMM");
	const equipmentCountLabel = `${operation.equipmentCount} ${
		operation.equipmentCount === 1 ? "equipo" : "equipos"
	}`;

	return (
		<li>
			<Link
				to="/dashboard/orders/$orderId"
				params={{ orderId: operation.id }}
				className="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-x-3 px-4 py-3 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:grid-cols-[4.5rem_minmax(0,1fr)_auto]"
			>
				<time dateTime={operation.scheduledAt} className="tabular-nums">
					{date && (
						<span className="block text-xs leading-tight text-muted-foreground">
							{date}
						</span>
					)}
					<span className="block font-semibold text-base leading-tight text-foreground">
						{time}
					</span>
				</time>
				<div className="min-w-0">
					<div className="flex min-w-0 items-baseline justify-between gap-2 sm:block">
						<p className="min-w-0 truncate font-medium text-sm text-foreground">
							#{formatOrderNumber(operation.rentalNumber)}
						</p>
						<p className="shrink-0 text-sm text-muted-foreground tabular-nums sm:hidden">
							{equipmentCountLabel}
						</p>
					</div>
					<p className="truncate text-sm text-muted-foreground">
						{operation.customer?.displayName ?? "Sin cliente"}
					</p>
				</div>
				<p className="hidden text-sm text-muted-foreground tabular-nums sm:block">
					{equipmentCountLabel}
				</p>
			</Link>
		</li>
	);
}

import type { RentalOperationSummaryDto } from "@repo/api-contracts";
import { Link } from "@tanstack/react-router";
import { formatTimestampInTimezone } from "@/lib/dates/format";
import { getFulfillmentMethodLabel } from "@/modules/rentals/shared/fulfillment-method";
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
	const timestamp = formatTimestampInTimezone(
		operation.scheduledAt,
		timezone,
		isSingleDay ? "HH:mm" : "DD MMM · HH:mm",
	);

	return (
		<li>
			<Link
				to="/dashboard/orders/$orderId"
				params={{ orderId: operation.id }}
				className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 px-4 py-3 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
			>
				<p className="shrink-0 font-medium text-sm text-foreground">
					#{formatOrderNumber(operation.rentalNumber)}
				</p>
				<div className="min-w-0">
					<p className="truncate text-sm text-foreground">
						{operation.customer?.displayName ?? "Sin cliente"}
					</p>
					<p className="text-xs text-muted-foreground">
						{getFulfillmentMethodLabel(operation.fulfillmentMethod)}
					</p>
				</div>
				<time
					dateTime={operation.scheduledAt}
					className="col-start-2 text-xs text-muted-foreground tabular-nums sm:col-start-auto sm:text-right sm:text-sm"
				>
					{timestamp}
				</time>
			</Link>
		</li>
	);
}

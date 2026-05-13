import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PendingReviewOrdersSearch } from "@/features/orders/pending-review-orders.search";
import { useLocations } from "@/features/tenant/locations/locations.queries";

const ALL_VALUE = "__ALL__";

interface PendingReviewOrdersToolbarProps {
	search: PendingReviewOrdersSearch;
	onLocationChange: (locationId?: string) => void;
}

export function PendingReviewOrdersToolbar({
	search,
	onLocationChange,
}: PendingReviewOrdersToolbarProps) {
	const { data: locations = [] } = useLocations();

	return (
		<div className="flex flex-wrap items-center gap-3">
			<Select
				value={search.locationId ?? ALL_VALUE}
				onValueChange={(value) => {
					if (value) {
						onLocationChange(value === ALL_VALUE ? undefined : value);
					}
				}}
				items={[
					{ value: ALL_VALUE, label: "Todas las ubicaciones" },
					...locations.map((location) => ({
						value: location.id,
						label: location.name,
					})),
				]}
			>
				<SelectTrigger className="h-9 w-full sm:w-64">
					<SelectValue placeholder="Ubicación" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={ALL_VALUE}>Todas las ubicaciones</SelectItem>
					{locations.map((location) => (
						<SelectItem key={location.id} value={location.id}>
							{location.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

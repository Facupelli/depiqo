import { useSuspenseQuery } from "@tanstack/react-query";
import { Outlet } from "@tanstack/react-router";
import { PageBreadcrumb } from "@/components/detail-id-breadcrumb";
import { rentableItemDetailQueries } from "../rentable-item-detail/rentable-item-detail.queries";
import { ComboDetailHeader } from "./combo-detail-header";
import { ComboDetailNavigation } from "./combo-detail-navigation";

export function ComboDetailPage({
	rentableItemId,
}: {
	rentableItemId: string;
}) {
	const { data: combo } = useSuspenseQuery(
		rentableItemDetailQueries.detail(rentableItemId),
	);
	return (
		<div className="px-4 pb-8 sm:px-6">
			<PageBreadcrumb
				parent={{ label: "Combos", to: "/dashboard/catalog/packages" }}
				current={combo.name}
			/>
			<div className="flex flex-col">
				<ComboDetailHeader combo={combo} />
				<ComboDetailNavigation rentableItemId={rentableItemId} />
				<div className="mt-5">
					<Outlet />
				</div>
			</div>
		</div>
	);
}

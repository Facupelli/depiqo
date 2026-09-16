import type { TenantPermission } from "@repo/api-contracts";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Outlet } from "@tanstack/react-router";
import { PageBreadcrumb } from "@/components/detail-id-breadcrumb";
import { DetailPageShell } from "@/components/detail-page-shell";
import { rentableItemDetailQueries } from "../rentable-item-detail/rentable-item-detail.queries";
import { ComboDetailHeader } from "./combo-detail-header";
import { ComboDetailNavigation } from "./combo-detail-navigation";

export function ComboDetailPage({
	rentableItemId,
	permissions,
}: {
	rentableItemId: string;
	permissions: readonly TenantPermission[];
}) {
	const { data: combo } = useSuspenseQuery(
		rentableItemDetailQueries.detail(rentableItemId),
	);
	return (
		<div className="pb-8">
			<DetailPageShell
				breadcrumb={
					<PageBreadcrumb
						parent={{ label: "Combos", to: "/dashboard/catalog/packages" }}
						current={combo.name}
					/>
				}
				header={<ComboDetailHeader combo={combo} />}
				navigation={
					<ComboDetailNavigation
						rentableItemId={rentableItemId}
						permissions={permissions}
					/>
				}
			>
				<Outlet />
			</DetailPageShell>
		</div>
	);
}

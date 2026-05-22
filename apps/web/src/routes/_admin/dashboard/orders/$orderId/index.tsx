import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageBreadcrumb } from "@/components/detail-id-breadcrumb";
import { accessoryPreparationQueries } from "@/features/orders/accessory-preparation/accessory-preparation.queries";
import { AccessoryPreparationWorkspace } from "@/features/orders/accessory-preparation/components/accessory-preparation-workspace";
import { OrderDetailProvider } from "@/features/orders/contexts/order-detail.context";
import { OrderHeader } from "@/features/orders/components/order-detail-header";
import { OrderEquipmentSection } from "@/features/orders/components/order-detail-equipment-section";
import { OrderClientCard } from "@/features/orders/components/order-detail-client-card";
import { OrderSigningCard } from "@/features/orders/components/order-detail-signing-card";
import { OrderLogisticsCard } from "@/features/orders/components/order-detail-logistics-card";
import { OrderFinancialsCard } from "@/features/orders/components/order-detail-financials-card";
import { getProductImagesByOrderItemId } from "@/features/orders/order-detail.utils";
import { ordersListSearchSchema } from "@/features/orders/orders-list.search";
import { createOrderDetailQueryOptions } from "@/features/orders/queries/get-order-by-id";
import { AdminRouteError } from "@/shared/components/admin-route-error";

export const Route = createFileRoute("/_admin/dashboard/orders/$orderId/")({
	validateSearch: ordersListSearchSchema,
	loader: async ({ context: { queryClient }, params: { orderId } }) => {
		await Promise.all([
			queryClient.ensureQueryData(createOrderDetailQueryOptions({ orderId })),
			queryClient.ensureQueryData(
				accessoryPreparationQueries.detail({ orderId }),
			),
		]);
	},
	errorComponent: ({ error }) => {
		return (
			<AdminRouteError
				error={error}
				genericMessage="No pudimos cargar el contenido del pedido."
				forbiddenMessage="No tienes permisos para ver el pedido."
			/>
		);
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { orderId } = Route.useParams();
	const search = Route.useSearch();
	const [isPreparingAccessories, setIsPreparingAccessories] = useState(false);
	const { data: order } = useSuspenseQuery(
		createOrderDetailQueryOptions({ orderId }),
	);
	const { data: preparation } = useSuspenseQuery(
		accessoryPreparationQueries.detail({ orderId }),
	);

	return (
		<OrderDetailProvider order={order}>
			<div className="min-h-screen bg-neutral-50 text-neutral-950 px-8">
				<PageBreadcrumb
					parent={{ label: "Pedidos", to: "/dashboard/orders", search }}
					current={String(order.number)}
				/>

				<OrderHeader preparation={preparation} />

				{isPreparingAccessories ? (
					<div className="py-10">
						<AccessoryPreparationWorkspace
							orderId={orderId}
							productImagesByOrderItemId={getProductImagesByOrderItemId(
								order.items,
							)}
							preparation={preparation}
							onClose={() => setIsPreparingAccessories(false)}
						/>
					</div>
				) : (
					<div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] py-10 gap-20">
						{/* Left */}
						<div>
							<OrderEquipmentSection
								onPrepareAccessories={() => setIsPreparingAccessories(true)}
							/>
						</div>

						{/* Right */}
						<div className="space-y-4">
							<OrderClientCard />
							<OrderSigningCard />
							<OrderLogisticsCard />
							<OrderFinancialsCard />
						</div>
					</div>
				)}
			</div>
		</OrderDetailProvider>
	);
}

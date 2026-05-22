import type { OrderDetailResponseDto } from "@repo/schemas";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { PageBreadcrumb } from "@/components/detail-id-breadcrumb";
import { OrderEditorComposerPage } from "@/features/orders/order-editor/components/order-editor-composer-page";
import { OrderEditorProvider } from "@/features/orders/order-editor/order-editor.context";
import { getOrderEditAvailability } from "@/features/orders/order-editor/utils/order-edit-availability";
import { getOrderEditorCopy } from "@/features/orders/order-editor/utils/order-editor-copy";
import { orderToEditorState } from "@/features/orders/order-editor/utils/order-to-editor-state";
import {
	createOrderDetailQueryOptions,
	parseOrderDetailResponse,
} from "@/features/orders/queries/get-order-by-id";
import { nowUtc } from "@/lib/dates/parse";

export const Route = createFileRoute("/_admin/dashboard/orders/$orderId/edit")({
	beforeLoad: async ({ context: { queryClient }, params: { orderId } }) => {
		const rawOrder = await queryClient.ensureQueryData(
			createOrderDetailQueryOptions({ orderId }),
		);
		const order = parseOrderDetailResponse(
			rawOrder as unknown as OrderDetailResponseDto,
		);

		const availability = getOrderEditAvailability(order, nowUtc());

		if (!availability.canEdit) {
			throw redirect({
				to: "/dashboard/orders/$orderId",
				params: { orderId },
			});
		}
	},
	loader: ({ context: { queryClient }, params: { orderId } }) => {
		// Data is already in cache from beforeLoad, this is effectively free
		return queryClient.ensureQueryData(
			createOrderDetailQueryOptions({ orderId }),
		);
	},
	component: EditOrderPage,
	preload: false,
});

function EditOrderPage() {
	const { orderId } = Route.useParams();
	const { data: order } = useSuspenseQuery(
		createOrderDetailQueryOptions({ orderId }),
	);
	const availability = getOrderEditAvailability(order, nowUtc());
	const mode = availability.canEdit ? availability.mode : "edit-draft";
	const copy = getOrderEditorCopy(mode);

	return (
		<div className="px-6 pb-10">
			<PageBreadcrumb
				parent={{ label: "Pedidos", to: "/dashboard/orders" }}
				current={copy.breadcrumbCurrent}
			/>

			<div className="space-y-1 pb-4">
				<h1 className="text-2xl font-semibold tracking-tight">
					{copy.pageTitle}
				</h1>
			</div>

			<OrderEditorProvider initialOrder={orderToEditorState(order)}>
				<OrderEditorComposerPage mode={mode} orderId={orderId} order={order} />
			</OrderEditorProvider>
		</div>
	);
}

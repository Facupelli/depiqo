import type { OrderStatus } from "@repo/types";
import { Fragment } from "react";
import { Button } from "@/components/ui/button";
import { OrderDetailActionsMenu } from "@/features/orders/components/order-detail-actions-menu";
import { OrderDetailBudgetDialogs } from "@/features/orders/components/order-detail-budget-dialogs";
import { OrderDetailCancelDialog } from "@/features/orders/components/order-detail-cancel-dialog";
import { OrderDetailConfirmDialog } from "@/features/orders/components/order-detail-confirm-dialog";
import { OrderDetailDocumentErrorDialogs } from "@/features/orders/components/order-detail-document-error-dialogs";
import { OrderDetailLifecycleDialog } from "@/features/orders/components/order-detail-lifecycle-dialog";
import { OrderDetailRejectDialog } from "@/features/orders/components/order-detail-reject-dialog";
import { OrderOperationalPhaseBadge } from "@/features/orders/components/order-operational-phase-badge";
import { OrderSigningInvitationDialog } from "@/features/orders/components/order-signing-invitation-dialog";
import { useOrderDetailContext } from "@/features/orders/contexts/order-detail.context";
import {
	formatOrderNumber,
	getOrderHeaderBannerConfig,
} from "@/features/orders/order.utils";
import {
	dotStyles,
	getOrderHeaderBannerIcon,
	getOrderHeaderPrimaryButtonConfig,
	getTimelineSteps,
	labelStyles,
	TERMINAL_STATUSES,
} from "@/features/orders/order-detail.utils";
import { ORDER_HEADER_BANNER_TONE_STYLES } from "@/features/orders/orders.constants";
import { nowUtc } from "@/lib/dates/parse";

export function OrderHeader({
	preparation,
}: {
	preparation: { hasSavedAccessory: boolean };
}) {
	const { order } = useOrderDetailContext();
	const isTerminal = TERMINAL_STATUSES.has(order.status as OrderStatus);

	return (
		<header className="border-b border-neutral-200 pb-8">
			<div className="flex flex-col gap-6">
				<div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
					<div>
						<div className="flex flex-wrap items-center gap-3 mb-1.5">
							<div>
								<h1 className="text-3xl font-bold tracking-tight leading-none">
									<span>#{formatOrderNumber(order.number)}</span>
								</h1>
							</div>
							{isTerminal ? <OrderOperationalPhaseBadge order={order} /> : null}
						</div>
						<p className="text-sm text-neutral-400 mt-2">
							Creado el {order.createdAt.format("DD MMM, YYYY")} ·{" "}
							{order.createdAt.format("HH:mm A")}
						</p>
					</div>

					<div className="flex justify-start xl:justify-end">
						<OrderDetailActionsMenu />
					</div>
				</div>

				{!isTerminal ? <OrderHeaderBanner preparation={preparation} /> : null}
			</div>

			<OrderDetailDocumentErrorDialogs />
			<OrderDetailCancelDialog />
			<OrderDetailLifecycleDialog />
			<OrderDetailConfirmDialog />
			<OrderDetailRejectDialog />
			<OrderDetailBudgetDialogs />
			<OrderSigningInvitationDialog />
		</header>
	);
}

function OrderHeaderBanner({
	preparation,
}: {
	preparation: { hasSavedAccessory: boolean };
}) {
	const { order } = useOrderDetailContext();
	const banner = getOrderHeaderBannerConfig(
		order,
		nowUtc(),
		order.location.effectiveTimezone,
	);
	const styles = ORDER_HEADER_BANNER_TONE_STYLES[banner.tone];
	const BannerIcon = getOrderHeaderBannerIcon(
		banner.tone,
		banner.primaryAction,
	);

	return (
		<section
			className={`rounded-2xl border px-5 py-5 sm:px-6 ${styles.panelClassName} ${banner.tone === "danger" ? "border-l-4 border-l-red-500" : ""}`}
		>
			<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
				<div className="flex items-start gap-4 min-w-0">
					<div
						className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${styles.iconWrapClassName}`}
					>
						<BannerIcon className={`size-6 ${styles.iconClassName}`} />
					</div>

					<div className="space-y-3 min-w-0">
						<h2 className="text-xl font-semibold tracking-tight text-neutral-950">
							{banner.title}
						</h2>
						<OrderTimeline order={order} preparation={preparation} />
					</div>
				</div>

				<div className="lg:shrink-0">
					<OrderHeaderBannerActions />
				</div>
			</div>
		</section>
	);
}

function OrderTimeline({
	order,
	preparation,
}: {
	order: { status: string; signing: { status: string } };
	preparation: { hasSavedAccessory: boolean };
}) {
	const steps = getTimelineSteps(order, preparation);

	return (
		<div className="flex items-center">
			{steps.map((step, i) => (
				<Fragment key={step.label}>
					{i > 0 && (
						<div
							className={`h-px flex-1 min-w-5 mb-4.25 shrink ${
								steps[i - 1].state === "completed"
									? "bg-neutral-950"
									: "bg-neutral-200"
							}`}
						/>
					)}
					<div className="flex flex-col items-center gap-1.5">
						<div
							className={`size-2 rounded-full shrink-0 ${dotStyles[step.state]}`}
						/>
						<span
							className={`text-[11px] whitespace-nowrap leading-none tracking-wide ${labelStyles[step.state]}`}
						>
							{step.label}
						</span>
					</div>
				</Fragment>
			))}
		</div>
	);
}

function OrderHeaderBannerActions() {
	const { order, actions } = useOrderDetailContext();
	const banner = getOrderHeaderBannerConfig(
		order,
		nowUtc(),
		order.location.effectiveTimezone,
	);
	const primaryAction = getOrderHeaderPrimaryButtonConfig(
		banner.primaryAction,
		order.status,
		actions,
	);

	if (!primaryAction) {
		return null;
	}

	const PrimaryIcon = primaryAction.icon;

	return (
		<Button className={primaryAction.className} onClick={primaryAction.onClick}>
			<PrimaryIcon className="size-4" />
			{primaryAction.label}
		</Button>
	);
}

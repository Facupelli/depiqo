import { OrderStatus } from "@repo/types";
import type { LucideIcon } from "lucide-react";
import {
	ChevronDown,
	CircleSlash,
	FileSignature,
	FileText,
	PencilLine,
} from "lucide-react";
import { Fragment } from "react/jsx-runtime";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	useOrderBudget,
	useOrderCancellation,
	useOrderDetailContext,
	useOrderDocuments,
	useOrderSigning,
} from "@/features/orders/contexts/order-detail.context";
import { getOrderEditAvailability } from "@/features/orders/order-editor/utils/order-edit-availability";
import { nowUtc } from "@/lib/dates/parse";

type ActionItem = {
	label: string;
	loadingLabel?: string;
	icon: LucideIcon;
	onClick: () => void;
	disabled?: boolean;
	variant?: "destructive";
};

type ActionGroup = ActionItem[];

function useOrderActionGroups(): ActionGroup[] {
	const { order, actions } = useOrderDetailContext();
	const budget = useOrderBudget();
	const documents = useOrderDocuments();
	const cancellation = useOrderCancellation();
	const signing = useOrderSigning();

	const isConfirmedLifecycle =
		order.status === OrderStatus.CONFIRMED ||
		order.status === OrderStatus.ACTIVE ||
		order.status === OrderStatus.COMPLETED;

	const canOpenBudget =
		order.status === OrderStatus.DRAFT ||
		order.status === OrderStatus.PENDING_REVIEW;

	const canOpenContract =
		order.status === OrderStatus.CONFIRMED ||
		order.status === OrderStatus.ACTIVE ||
		order.status === OrderStatus.COMPLETED;

	const canCancel =
		order.status === OrderStatus.DRAFT ||
		order.status === OrderStatus.PENDING_REVIEW ||
		order.status === OrderStatus.CONFIRMED;

	const canManageSigning =
		isConfirmedLifecycle && order.signing.status !== "SIGNED";
	const isSignedContract = order.signing.status === "SIGNED";

	const editAvailability = getOrderEditAvailability(order, nowUtc());

	const signingAction: ActionItem = {
		icon: FileSignature,
		label:
			order.signing.status === "NO_REQUEST"
				? "Enviar invitación de firma"
				: "Reenviar invitación de firma",
		loadingLabel: "Preparando invitación...",
		onClick:
			order.signing.status === "NO_REQUEST"
				? signing.openSendDialog
				: signing.openResendDialog,
		disabled: signing.isPending,
	};

	const groups: ActionGroup[] = [
		editAvailability.canEdit
			? [
					{
						icon: PencilLine,
						label: "Editar pedido",
						onClick: actions.edit.open,
					},
				]
			: [],

		canOpenBudget
			? [
					{
						icon: FileText,
						label: "Ver presupuesto",
						loadingLabel: "Abriendo presupuesto...",
						onClick: budget.open,
						disabled: budget.isOpening,
					},
				]
			: [],

		canOpenContract
			? [
					{
						icon: FileText,
						label: isSignedContract ? "Ver remito firmado" : "Ver remito",
						loadingLabel: "Abriendo remito...",
						onClick: documents.contract.open,
						disabled: documents.contract.isOpening,
					},
				]
			: [],

		canManageSigning ? [signingAction] : [],

		canCancel
			? [
					{
						icon: CircleSlash,
						label: "Cancelar pedido",
						onClick: cancellation.openDialog,
						variant: "destructive" as const,
					},
				]
			: [],
	].filter((group) => group.length > 0);

	return groups;
}

export function OrderDetailActionsMenu() {
	const groups = useOrderActionGroups();

	if (groups.length === 0) return null;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button variant="outline">
						Acciones
						<ChevronDown className="size-4" />
					</Button>
				}
			/>

			<DropdownMenuContent align="end" className="w-56">
				{groups.map((group, groupIndex) => (
					// biome-ignore lint: false positive
					<Fragment key={groupIndex}>
						{groupIndex > 0 && <DropdownMenuSeparator />}
						{group.map((action) => (
							<DropdownMenuItem
								key={action.label}
								onClick={action.onClick}
								disabled={action.disabled}
								variant={action.variant}
							>
								<action.icon className="mr-2 h-4 w-4" />
								{action.disabled && action.loadingLabel
									? action.loadingLabel
									: action.label}
							</DropdownMenuItem>
						))}
					</Fragment>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

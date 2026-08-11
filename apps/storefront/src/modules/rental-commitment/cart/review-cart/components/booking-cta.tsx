import { Button } from "@repo/ui/components/button";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useCreateConfirmedRental } from "@/modules/rental-commitment/confirmed-rentals/create-confirmed-rental/create-confirmed-rental.mutation";
import { useCurrentCustomer } from "@/modules/tenant-management/auth/customer-auth.queries";
import { resolveCustomerReturnTo } from "@/modules/tenant-management/auth/customer-return-to";
import { ProblemDetailsError } from "@/shared/errors";
import { useRentalCartActions } from "../../rental-cart.hooks";
import {
	classifyConfirmedRentalError,
	type ConfirmedRentalErrorKind,
} from "../confirmed-rental-error";
import type { ConfirmedRentalRequestFailure } from "../confirmed-rental-request";
import {
	useCartFulfillmentContext,
	useCartPeriodContext,
} from "../cart-page.context";
import { useConfirmedRentalRequest } from "../use-confirmed-rental-request";
import { formatDeliveryAddressSummary } from "../cart-checkout.utils";

export function BookingCta() {
	const booking = useCartBookingCommand();

	return (
		<section className="rounded-xl border bg-card p-5">
			{booking.errorMessage ? (
				<p
					role="alert"
					className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
				>
					{booking.errorMessage}
				</p>
			) : null}
			<Button
				type="button"
				className="w-full gap-2"
				disabled={booking.isDisabled}
				onClick={booking.submit}
			>
				{booking.isPending ? (
					<LoaderCircle className="size-4 animate-spin" />
				) : null}
				{booking.label}
			</Button>
		</section>
	);
}

function useCartBookingCommand() {
	const navigate = useNavigate();
	const location = useLocation();
	const returnTo = resolveCustomerReturnTo(location.href);
	const { data: customer, isPending: isCustomerPending } = useCurrentCustomer();
	const { mutateAsync: createConfirmedRental, isPending } =
		useCreateConfirmedRental();
	const { clearCart } = useRentalCartActions();
	const confirmedRentalRequest = useConfirmedRentalRequest();
	const { periodStart, branch, pickupSlot } = useCartPeriodContext();
	const { fulfillmentMethod, deliveryRequest, selectFulfillmentMethod } =
		useCartFulfillmentContext();
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const submit = async () => {
		if (isPending) return;

		setErrorMessage(null);

		if (isCustomerPending) return;

		if (!customer) {
			await navigate({
				to: "/login",
				search: { returnTo },
			});
			return;
		}

		if (!confirmedRentalRequest.ok) {
			setErrorMessage(getRequestFailureMessage(confirmedRentalRequest.failure));
			return;
		}

		try {
			const rental = await createConfirmedRental({
				body: confirmedRentalRequest.body,
			});
			const pickupTime = pickupSlot
				? formatSlotMinuteOfDay(pickupSlot.minuteOfDay)
				: "";
			const deliveryAddress =
				fulfillmentMethod === "DELIVERY"
					? formatDeliveryAddressSummary(deliveryRequest)
					: undefined;

			clearCart();
			await navigate({
				to: "/confirmed-rental-success",
				search: {
					rentalId: rental.id,
					fulfillmentMethod,
					pickupDate: periodStart,
					pickupLocation: branch.name,
					pickupTime,
					deliveryAddress,
				},
				replace: true,
			});
		} catch (error) {
			const kind =
				error instanceof ProblemDetailsError
					? classifyConfirmedRentalError(error)
					: "OTHER";
			if (kind === "UNAUTHENTICATED") {
				await navigate({
					to: "/login",
					search: { returnTo },
				});
				return;
			}
			if (kind === "DELIVERY_NOT_SUPPORTED") {
				selectFulfillmentMethod("PICKUP");
			}
			setErrorMessage(getSubmissionErrorMessage(kind));
		}
	};

	return {
		errorMessage,
		isDisabled: isCustomerPending || isPending,
		isPending,
		label: isCustomerPending
			? "Verificando sesión..."
			: isPending
				? "Confirmando reserva..."
				: customer
					? "Confirmar reserva"
					: "Iniciar sesión para reservar",
		submit,
	};
}

function getRequestFailureMessage(
	failure: ConfirmedRentalRequestFailure,
): string {
	switch (failure.kind) {
		case "PICKUP_SLOT_REQUIRED":
		case "RETURN_SLOT_REQUIRED":
			return "Seleccioná los horarios de retiro y devolución para continuar.";
		case "INVALID_RENTAL_PERIOD":
			return "La devolución debe ser posterior al retiro.";
		case "DELIVERY_DETAILS_REQUIRED":
			return "Completá y confirmá la dirección de entrega para continuar.";
		case "EMPTY_CART":
			return "Tu carrito está vacío.";
		case "INVALID_REQUEST":
			return "Revisá los datos de la reserva antes de continuar.";
	}
}

function getSubmissionErrorMessage(kind: ConfirmedRentalErrorKind): string {
	switch (kind) {
		case "AVAILABILITY_CONFLICT":
			return "Algunos equipos ya no están disponibles para este período. Ajustá el carrito y volvé a intentarlo.";
		case "DELIVERY_NOT_SUPPORTED":
			return "Esta sucursal solo permite retiro en el local.";
		case "IDEMPOTENCY_IN_PROGRESS":
			return "Tu reserva todavía se está procesando. Esperá unos segundos y volvé a intentarlo.";
		case "IDEMPOTENCY_CONFLICT":
			return "Los datos de la reserva cambiaron durante el envío. Revisá la reserva y volvé a confirmarla.";
		case "OTHER":
		case "UNAUTHENTICATED":
			return "No pudimos confirmar la reserva. Intentá nuevamente.";
	}
}

function formatSlotMinuteOfDay(minuteOfDay: number): string {
	return `${String(Math.floor(minuteOfDay / 60)).padStart(2, "0")}:${String(
		minuteOfDay % 60,
	).padStart(2, "0")}`;
}

import { BookingMode, OrderCommunicationMode, OrderStatus } from "@repo/types";

export function getOrderSubmitButtonLabel({
	bookingMode,
	orderCommunicationMode,
	isAuthenticated,
}: {
	bookingMode: BookingMode;
	orderCommunicationMode: OrderCommunicationMode;
	isAuthenticated: boolean;
}) {
	if (!isAuthenticated) {
		return getBookingSubmitButtonLabel({
			bookingMode,
			isAuthenticated,
		});
	}

	if (orderCommunicationMode === OrderCommunicationMode.WHATSAPP) {
		return "Pedir por WhatsApp";
	}

	return getBookingSubmitButtonLabel({
		bookingMode,
		isAuthenticated,
	});
}

export function getBookingSubmitButtonLabel({
	bookingMode,
	isAuthenticated,
}: {
	bookingMode: BookingMode;
	isAuthenticated: boolean;
}) {
	if (!isAuthenticated) {
		return bookingMode === BookingMode.REQUEST_TO_BOOK
			? "Iniciar sesión para solicitar la reserva"
			: "Iniciar sesión para reservar";
	}

	return bookingMode === BookingMode.REQUEST_TO_BOOK
		? "Solicitar reserva"
		: "Confirmar reserva";
}

export function resolveOrderConfirmationStatus({
	bookingMode,
	status,
}: {
	bookingMode?: BookingMode;
	status?: OrderStatus;
}) {
	if (status) {
		return status;
	}

	return bookingMode === BookingMode.REQUEST_TO_BOOK
		? OrderStatus.PENDING_REVIEW
		: OrderStatus.CONFIRMED;
}

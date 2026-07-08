export type StorefrontBookingMode = "instant-book" | "request-to-book";
export type StorefrontOrderCommunicationMode = "FORMAL" | "WHATSAPP";
export type StorefrontRentalStatus = "PENDING" | "CONFIRMED";

export function getOrderSubmitButtonLabel({
	bookingMode,
	orderCommunicationMode,
	isAuthenticated,
}: {
	bookingMode: StorefrontBookingMode;
	orderCommunicationMode: StorefrontOrderCommunicationMode;
	isAuthenticated: boolean;
}) {
	if (!isAuthenticated) {
		return getBookingSubmitButtonLabel({
			bookingMode,
			isAuthenticated,
		});
	}

	if (orderCommunicationMode === "WHATSAPP") {
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
	bookingMode: StorefrontBookingMode;
	isAuthenticated: boolean;
}) {
	if (!isAuthenticated) {
		return bookingMode === "request-to-book"
			? "Iniciar sesión para solicitar la reserva"
			: "Iniciar sesión para reservar";
	}

	return bookingMode === "request-to-book"
		? "Solicitar reserva"
		: "Confirmar reserva";
}

export function resolveOrderConfirmationStatus({
	bookingMode,
	status,
}: {
	bookingMode?: StorefrontBookingMode;
	status?: StorefrontRentalStatus;
}): StorefrontRentalStatus {
	if (status) {
		return status;
	}

	return bookingMode === "request-to-book" ? "PENDING" : "CONFIRMED";
}

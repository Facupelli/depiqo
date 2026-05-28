import type { OrderEditorMode } from "@/features/orders/order-editor/types/order-editor.types";

type OrderEditorCopy = {
	pageTitle: string;
	breadcrumbCurrent: string;
	setupTitle: string;
	setupCustomerOptionalLabel: string;
	logisticsDescription: string;
	itemsDescription: string;
	emptyItemsText: string;
	sidebarTitle: string;
	sidebarDescription: string;
	saveLabel: string;
	savingLabel: string;
	resetLabel: string;
	incompleteText: string;
	locationRequiredText: string;
	periodRequiredText: string;
	itemsRequiredText: string;
	deliveryRequiredText: string;
	pickerLocationRequiredText: string;
	addProductFallbackError: string;
	addBundleFallbackError: string;
	impactTitle: string | null;
	impactDescription: string | null;
};

export function getOrderEditorCopy(mode: OrderEditorMode): OrderEditorCopy {
	const isDraftMode = mode === "create-draft" || mode === "edit-draft";

	if (isDraftMode) {
		return {
			pageTitle: mode === "create-draft" ? "Crear borrador" : "Editar borrador",
			breadcrumbCurrent:
				mode === "create-draft" ? "Crear borrador" : "Editar borrador",
			setupTitle: "Configuración del borrador",
			setupCustomerOptionalLabel: "(Opcional)",
			logisticsDescription:
				"Si elegís entrega, el borrador necesita una solicitud de entrega completa.",
			itemsDescription: "Agregá ítems al borrador.",
			emptyItemsText: "Todavía no hay ítems en el borrador local.",
			sidebarTitle: "Resumen del borrador",
			sidebarDescription: "Total visible mientras ajustás precios e ítems.",
			saveLabel: "Guardar borrador",
			savingLabel: "Guardando...",
			resetLabel: "Reiniciar borrador local",
			incompleteText:
				"Falta completar el período o los ítems antes de guardar.",
			locationRequiredText:
				"Seleccioná una locación antes de guardar el borrador.",
			periodRequiredText:
				"Completá el periodo compartido antes de guardar el borrador.",
			itemsRequiredText:
				"Agregá al menos un item antes de guardar el borrador.",
			deliveryRequiredText:
				"Completá el delivery request antes de guardar un borrador con entrega.",
			pickerLocationRequiredText:
				"Seleccioná una locación en el sidebar antes de buscar items para el borrador.",
			addProductFallbackError: "No pudimos agregar el producto al borrador.",
			addBundleFallbackError: "No pudimos agregar el combo al borrador.",
			impactTitle: null,
			impactDescription: null,
		};
	}

	const base = {
		breadcrumbCurrent: "Editar pedido",
		setupTitle: "Configuración del pedido",
		setupCustomerOptionalLabel: "",
		logisticsDescription:
			"Si elegís entrega, el pedido necesita una solicitud de entrega completa.",
		itemsDescription: "Agregá o quitá ítems del pedido.",
		emptyItemsText: "Todavía no hay ítems en el pedido.",
		sidebarTitle: "Resumen del pedido",
		sidebarDescription: "Total visible mientras ajustás precios e ítems.",
		saveLabel: "Guardar cambios",
		savingLabel: "Guardando...",
		resetLabel: "Reiniciar cambios",
		incompleteText: "Falta completar el período o los ítems antes de guardar.",
		locationRequiredText: "Seleccioná una locación antes de guardar el pedido.",
		periodRequiredText:
			"Completá el periodo compartido antes de guardar el pedido.",
		itemsRequiredText: "Agregá al menos un item antes de guardar el pedido.",
		deliveryRequiredText:
			"Completá el delivery request antes de guardar un pedido con entrega.",
		pickerLocationRequiredText:
			"Seleccioná una locación en el sidebar antes de buscar items para el pedido.",
		addProductFallbackError: "No pudimos agregar el producto al pedido.",
		addBundleFallbackError: "No pudimos agregar el combo al pedido.",
	};

	if (mode === "edit-pending-review") {
		return {
			...base,
			pageTitle: "Editar pedido pendiente de revisión",
			impactTitle: "Pedido pendiente de revisión",
			impactDescription:
				"Estos cambios se guardan antes de confirmar el pedido.",
		};
	}

	return {
		...base,
		pageTitle: "Editar pedido confirmado",
		impactTitle: "Pedido confirmado",
		impactDescription:
			"Este pedido ya está confirmado. Guardar cambios puede recalcular precio, disponibilidad, logística y documentos.",
	};
}

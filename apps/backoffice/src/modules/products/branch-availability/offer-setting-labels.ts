export function storeVisibilityLabel(showInStore: boolean): string {
	return showInStore ? "Mostrar en tienda" : "No visible en tienda";
}

export function rentalPermissionLabel(isRentable: boolean): string {
	return isRentable ? "Permitir alquiler" : "Alquiler no permitido";
}

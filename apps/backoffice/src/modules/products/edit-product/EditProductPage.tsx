import type { GetRentableItemDetailResponseDto } from "@repo/api-contracts";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useEquipmentTypeOptions } from "@/modules/inventory/equipment-types/public";
import { useCategories } from "@/modules/settings/categories/public";
import useDebounce from "@/shared/hooks/use-debounce";
import { EditProductForm } from "./EditProductForm";
import { useUpdateProduct } from "./edit-product.mutation";
import {
	fromProductDetailToEditProductFormValues,
	toUpdateProductDto,
} from "./edit-product.schema";

const equipmentTypeSearchLimit = 15;

export function EditProductPage({
	product,
}: {
	product: GetRentableItemDetailResponseDto;
}) {
	const navigate = useNavigate();
	const [equipmentSearch, setEquipmentSearch] = useState("");
	const debouncedEquipmentSearch = useDebounce(equipmentSearch, 300);
	const { data: categories = [], isPending: isCategoriesPending } =
		useCategories();
	const {
		data: equipmentTypes = [],
		isFetching: isEquipmentSearchFetching,
		isError: isEquipmentSearchError,
	} = useEquipmentTypeOptions({
		search: debouncedEquipmentSearch.trim() || undefined,
		limit: equipmentTypeSearchLimit,
	});
	const isEquipmentSearchDebouncing =
		equipmentSearch.trim() !== debouncedEquipmentSearch.trim();
	const { mutateAsync: updateProduct, isPending } = useUpdateProduct();
	const defaultValues = fromProductDetailToEditProductFormValues(product);
	const originalEquipmentTypeId = product.requiredEquipment[0]?.equipmentTypeId;

	if (!originalEquipmentTypeId) {
		throw new Error("El alquiler individual no tiene un equipo asociado.");
	}

	const handleCancel = () =>
		navigate({
			to: "/dashboard/inventory/equipment-types/$equipmentTypeId/rentals",
			params: { equipmentTypeId: originalEquipmentTypeId },
		});

	return (
		<div className="mx-auto w-full max-w-6xl px-6 py-10">
			<header className="mb-10 max-w-3xl">
				<p className="font-medium text-muted-foreground text-sm">Equipo</p>
				<h1 className="mt-2 font-semibold text-3xl tracking-tight">
					Editar alquiler
				</h1>
				<p className="mt-3 text-muted-foreground">
					Actualiza la información y el equipo requerido para {product.name}.
				</p>
			</header>

			<EditProductForm
				key={product.id}
				formId={`edit-product-${product.id}`}
				defaultValues={defaultValues}
				categories={categories.filter((category) => category.isActive)}
				isCategoriesLoading={isCategoriesPending}
				equipmentTypes={equipmentTypes}
				equipmentSearch={equipmentSearch}
				isEquipmentSearchFetching={
					isEquipmentSearchDebouncing || isEquipmentSearchFetching
				}
				isEquipmentSearchError={isEquipmentSearchError}
				onEquipmentSearchChange={setEquipmentSearch}
				isPending={isPending}
				onCancel={handleCancel}
				onSubmit={async (values) => {
					const submittedEquipmentTypeId =
						values.requirements[0]?.equipmentTypeId;

					if (!submittedEquipmentTypeId) {
						throw new Error(
							"El alquiler individual no tiene un equipo asociado.",
						);
					}

					await updateProduct({
						rentableItemId: product.id,
						body: toUpdateProductDto(values),
					});
					await navigate({
						to: "/dashboard/inventory/equipment-types/$equipmentTypeId/rentals",
						params: { equipmentTypeId: submittedEquipmentTypeId },
					});
				}}
			/>
		</div>
	);
}

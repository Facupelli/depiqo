import type { GetRentableItemDetailResponseDto } from "@repo/api-contracts";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useEquipmentTypeOptions } from "@/modules/inventory/equipment-types/public";
import { useCategories } from "@/modules/settings/categories/public";
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
	const { data: categories = [], isPending: isCategoriesPending } =
		useCategories();
	const { data: equipmentTypes = [] } = useEquipmentTypeOptions({
		search: equipmentSearch.trim() || undefined,
		limit: equipmentTypeSearchLimit,
	});
	const { mutateAsync: updateProduct, isPending } = useUpdateProduct();
	const defaultValues = fromProductDetailToEditProductFormValues(product);

	return (
		<div className="mx-auto w-full max-w-6xl px-6 py-10">
			<header className="mb-10 max-w-3xl">
				<p className="font-medium text-muted-foreground text-sm">Productos</p>
				<h1 className="mt-2 font-semibold text-3xl tracking-tight">
					Editar producto
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
				onEquipmentSearchChange={setEquipmentSearch}
				isPending={isPending}
				onCancel={() =>
					navigate({
						to: "/dashboard/catalog/$rentableItemId",
						params: { rentableItemId: product.id },
					})
				}
				onSubmit={async (values) => {
					await updateProduct({
						rentableItemId: product.id,
						body: toUpdateProductDto(values),
					});
					await navigate({
						to: "/dashboard/catalog/$rentableItemId",
						params: { rentableItemId: product.id },
					});
				}}
			/>
		</div>
	);
}

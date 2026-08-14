import { useNavigate } from "@tanstack/react-router";
import { useOwnerOptions } from "@/modules/inventory/ownership/owner-options.queries";
import { useBranches } from "@/modules/settings/branches/branches.queries";
import { useCategories } from "@/modules/settings/categories/categories.queries";
import { CreateProductForm } from "./CreateProductForm";
import { useCreateProduct } from "./create-product.mutation";
import { toCreateProductDto } from "./create-product.schema";

const formId = "create-product";

export function CreateProductPage() {
	const navigate = useNavigate();
	const { data: categories = [] } = useCategories();
	const { data: branches = [] } = useBranches();
	const { data: owners = [] } = useOwnerOptions();
	const { mutateAsync: createProduct, isPending } = useCreateProduct();

	return (
		<div className="mx-auto w-full max-w-6xl px-6 py-10">
			<header className="mb-10 max-w-3xl">
				<p className="font-medium text-muted-foreground text-sm">Productos</p>
				<h1 className="mt-2 font-semibold text-3xl tracking-tight">
					Crear producto
				</h1>
				<p className="mt-3 text-muted-foreground">
					Define cómo se mostrará este producto en el catálogo de alquiler.
				</p>
			</header>

			<CreateProductForm
				formId={formId}
				categories={categories.filter((category) => category.isActive)}
				branches={branches}
				owners={owners}
				isPending={isPending}
				onCancel={() => navigate({ to: "/dashboard/catalog" })}
				onSubmit={async (values) => {
					await createProduct(toCreateProductDto(values));
					navigate({ to: "/dashboard/catalog" });
				}}
			/>
		</div>
	);
}

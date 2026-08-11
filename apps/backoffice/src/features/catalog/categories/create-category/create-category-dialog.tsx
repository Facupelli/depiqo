import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@repo/ui/components/dialog";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useCreateCategory } from "./create-category.mutation";
import { CreateCategoryForm } from "./create-category-form";
import { toCreateCategoryDto } from "./create-category-form.schema";

const formId = "create-v2-category";

export function CreateCategoryDialog() {
	const [open, setOpen] = useState(false);
	const { mutateAsync: createCategory, isPending } = useCreateCategory();

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger
				render={
					<Button>
						<Plus className="mr-2 h-4 w-4" />
						Crear categoría
					</Button>
				}
			/>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Crear categoría</DialogTitle>
					<DialogDescription>
						Agrega una categoría para organizar los ítems del catálogo.
					</DialogDescription>
				</DialogHeader>

				{open && (
					<CreateCategoryForm
						formId={formId}
						isPending={isPending}
						onCancel={() => setOpen(false)}
						onSubmit={async (values) => {
							await createCategory({ body: toCreateCategoryDto(values) });
							setOpen(false);
						}}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}

import { Alert, AlertDescription } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { BranchForm } from "../BranchForm";
import { getBranchSaveErrorMessage } from "../branch-save-errors";
import { useBranchDetail } from "../branches.queries";
import {
	toUpdateBranchBodyDto,
	toUpdateBranchFormDefaults,
	type UpdateBranchFormValues,
	updateBranchFormSchema,
} from "./edit-branch.schema";
import { useUpdateBranch } from "./update-branch.mutation";

type EditBranchPageProps = {
	branchId: string;
	onBack: () => void;
	onUpdated: () => void;
};

const formId = "update-branch";

export function EditBranchPage({
	branchId,
	onBack,
	onUpdated,
}: EditBranchPageProps) {
	const {
		data: branch,
		isPending: isBranchPending,
		isError,
	} = useBranchDetail(branchId);
	const { mutateAsync: updateBranch, isPending: isUpdatePending } =
		useUpdateBranch();
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	async function handleSubmit(values: UpdateBranchFormValues) {
		setErrorMessage(null);

		try {
			await updateBranch({
				params: { branchId },
				body: toUpdateBranchBodyDto(values),
			});
			onUpdated();
		} catch (error) {
			setErrorMessage(
				getBranchSaveErrorMessage(
					error,
					"Ocurrió un error al actualizar la sucursal.",
				),
			);
		}
	}

	if (isBranchPending) {
		return (
			<div className="space-y-6 p-8">
				<p className="text-sm text-muted-foreground">Cargando sucursal...</p>
			</div>
		);
	}

	if (isError || !branch) {
		return (
			<div className="space-y-6 p-8">
				<Button
					type="button"
					variant="ghost"
					className="-ml-3 text-muted-foreground"
					onClick={onBack}
				>
					<ArrowLeft className="mr-2 h-4 w-4" />
					Volver a sucursales
				</Button>
				<p className="text-sm text-destructive">
					No pudimos cargar la sucursal. Inténtalo nuevamente.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-6 p-8">
			<div className="flex items-start justify-between gap-4">
				<div className="space-y-2">
					<Button
						type="button"
						variant="ghost"
						className="-ml-3 text-muted-foreground"
						onClick={onBack}
					>
						<ArrowLeft className="mr-2 h-4 w-4" />
						Volver a sucursales
					</Button>
					<div>
						<h1 className="text-2xl font-semibold tracking-tight">
							Editar sucursal
						</h1>
						<p className="text-sm text-muted-foreground">
							Actualiza los datos operativos de {branch.name}.
						</p>
					</div>
				</div>
			</div>

			{errorMessage && (
				<Alert variant="destructive">
					<AlertDescription>{errorMessage}</AlertDescription>
				</Alert>
			)}

			<BranchForm
				formId={formId}
				defaultValues={toUpdateBranchFormDefaults(branch)}
				validator={updateBranchFormSchema}
				submitLabel="Guardar cambios"
				isPending={isUpdatePending}
				onSubmit={handleSubmit}
				onCancel={onBack}
			/>
		</div>
	);
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AdminRouteError } from "@/shared/components/admin-route-error";
import { ProblemDetailsError } from "@/shared/errors";
import { useBranchDetail } from "@/features/tenant-management/branch/branch.queries";
import { BranchForm } from "@/features/tenant-management/branch/components/branch-form";
import { useUpdateBranch } from "@/features/tenant-management/branch/update-branch/update-branch.mutation";
import {
	toUpdateBranchBodyDto,
	toUpdateBranchFormDefaults,
	type UpdateBranchFormValues,
	updateBranchFormSchema,
} from "@/features/tenant-management/branch/update-branch/update-branch-form.schema";

export const Route = createFileRoute(
	"/_admin/dashboard/locations/$branchId/edit",
)({
	errorComponent: ({ error }) => {
		return (
			<AdminRouteError
				error={error}
				genericMessage="No pudimos cargar la edición de sucursal."
				forbiddenMessage="No tienes permisos para editar sucursales."
			/>
		);
	},
	component: UpdateBranchPage,
});

const formId = "update-branch";

function UpdateBranchPage() {
	const { branchId } = Route.useParams();
	const navigate = useNavigate();
	const {
		data: branch,
		isPending: isBranchPending,
		isError,
	} = useBranchDetail(branchId);
	const { mutateAsync: updateBranch, isPending: isUpdatePending } =
		useUpdateBranch();
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	function goBackToBranches() {
		navigate({ to: "/dashboard/locations" });
	}

	async function handleSubmit(values: UpdateBranchFormValues) {
		setErrorMessage(null);

		try {
			await updateBranch({
				params: { branchId },
				body: toUpdateBranchBodyDto(values),
			});
			goBackToBranches();
		} catch (error) {
			if (error instanceof ProblemDetailsError) {
				setErrorMessage(
					error.problemDetails.detail ??
						error.problemDetails.title ??
						"No pudimos actualizar la sucursal.",
				);
				return;
			}

			setErrorMessage("Ocurrió un error al actualizar la sucursal.");
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
					onClick={goBackToBranches}
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
						onClick={goBackToBranches}
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
				onCancel={goBackToBranches}
			/>
		</div>
	);
}

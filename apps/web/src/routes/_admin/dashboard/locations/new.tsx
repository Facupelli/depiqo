import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AdminRouteError } from "@/shared/components/admin-route-error";
import { ProblemDetailsError } from "@/shared/errors";
import { BranchForm } from "@/v2/features/tenant-management/branch/components/branch-form";
import {
	type CreateBranchFormValues,
	createBranchFormSchema,
	toCreateBranchBodyDto,
} from "@/v2/features/tenant-management/branch/create-branch/components/create-branch-form.schema";
import { useCreateBranch } from "@/v2/features/tenant-management/branch/create-branch/create-branch.mutation";

export const Route = createFileRoute("/_admin/dashboard/locations/new")({
	errorComponent: ({ error }) => {
		return (
			<AdminRouteError
				error={error}
				genericMessage="No pudimos cargar la creación de sucursal."
				forbiddenMessage="No tienes permisos para crear sucursales."
			/>
		);
	},
	component: CreateBranchPage,
});

const formId = "create-branch";

function CreateBranchPage() {
	const navigate = useNavigate();
	const { mutateAsync: createBranch, isPending } = useCreateBranch();
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	function goBackToBranches() {
		navigate({ to: "/dashboard/locations" });
	}

	async function handleSubmit(values: CreateBranchFormValues) {
		setErrorMessage(null);

		try {
			await createBranch({ body: toCreateBranchBodyDto(values) });
			goBackToBranches();
		} catch (error) {
			if (error instanceof ProblemDetailsError) {
				setErrorMessage(
					error.problemDetails.detail ??
						error.problemDetails.title ??
						"No pudimos crear la sucursal.",
				);
				return;
			}

			setErrorMessage("Ocurrió un error al crear la sucursal.");
		}
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
							Nueva sucursal
						</h1>
						<p className="text-sm text-muted-foreground">
							Crea una sucursal y, si quieres, deja configurados sus horarios
							semanales iniciales.
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
				validator={createBranchFormSchema}
				submitLabel="Crear sucursal"
				isPending={isPending}
				onSubmit={handleSubmit}
				onCancel={goBackToBranches}
			/>
		</div>
	);
}

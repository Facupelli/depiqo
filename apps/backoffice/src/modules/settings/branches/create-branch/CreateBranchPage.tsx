import { Alert, AlertDescription } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { ProblemDetailsError } from "@/shared/errors";
import { BranchForm } from "../BranchForm";
import { useCreateBranch } from "./create-branch.mutation";
import {
	type CreateBranchFormValues,
	createBranchFormSchema,
	toCreateBranchBodyDto,
} from "./create-branch.schema";

type CreateBranchPageProps = {
	onBack: () => void;
	onCreated: () => void;
};

const formId = "create-branch";

export function CreateBranchPage({ onBack, onCreated }: CreateBranchPageProps) {
	const { mutateAsync: createBranch, isPending } = useCreateBranch();
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	async function handleSubmit(values: CreateBranchFormValues) {
		setErrorMessage(null);

		try {
			await createBranch({ body: toCreateBranchBodyDto(values) });
			onCreated();
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
						onClick={onBack}
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
				onCancel={onBack}
			/>
		</div>
	);
}

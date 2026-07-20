import { useUploadFile } from "@better-upload/client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { buildR2PublicUrl } from "@/lib/r2-public-url";
import { ProblemDetailsError } from "@/shared/errors";
import { useContractSigner } from "../../tenant.queries";
import { useCreateContractSigner } from "../create-contract-signer/create-contract-signer.mutation";
import { useUpdateContractSigner } from "../update-contract-signer/update-contract-signer.mutation";
import { TenantContractSignerForm } from "./tenant-contract-signer-form";
import {
	type TenantContractSignerFormValues,
	tenantContractSignerToFormValues,
	toContractSignerBodyDto,
} from "./tenant-contract-signer-form.schema";

export function TenantContractSignerSettingsSection() {
	const contractSignerQuery = useContractSigner();
	const { mutateAsync: createContractSigner, isPending: isCreating } =
		useCreateContractSigner();
	const { mutateAsync: updateContractSigner, isPending: isUpdating } =
		useUpdateContractSigner();
	const signatureUploader = useUploadFile({
		api: "/api/branding-upload",
		route: "userSignature",
	});
	const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	if (contractSignerQuery.isPending) {
		return (
			<Card>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						Cargando firmante de contratos...
					</p>
				</CardContent>
			</Card>
		);
	}

	if (contractSignerQuery.isError) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>No pudimos cargar el firmante</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-destructive">
						{contractSignerQuery.error instanceof ProblemDetailsError
							? contractSignerQuery.error.problemDetails.detail
							: "Ocurrio un error cargando el firmante de contratos."}
					</p>
				</CardContent>
			</Card>
		);
	}

	const mode = contractSignerQuery.data ? "update" : "create";
	const defaultValues = tenantContractSignerToFormValues(
		contractSignerQuery.data,
	);
	const formKey = JSON.stringify({
		mode,
		fullName: defaultValues.fullName,
		documentNumber: defaultValues.documentNumber,
		phone: defaultValues.phone,
		address: defaultValues.address,
		signatureUrl: defaultValues.signatureUrl,
	});

	return (
		<TenantContractSignerForm
			key={formKey}
			defaultValues={defaultValues}
			mode={mode}
			isPending={isCreating || isUpdating || signatureUploader.isPending}
			feedbackMessage={feedbackMessage}
			errorMessage={errorMessage}
			onSubmit={async (values) => {
				await handleSubmit({
					mode,
					values,
					createContractSigner,
					updateContractSigner,
					signatureUploader,
					setFeedbackMessage,
					setErrorMessage,
				});
			}}
		/>
	);
}

async function handleSubmit({
	mode,
	values,
	createContractSigner,
	updateContractSigner,
	signatureUploader,
	setFeedbackMessage,
	setErrorMessage,
}: {
	mode: "create" | "update";
	values: TenantContractSignerFormValues;
	createContractSigner: (
		variables: ReturnType<typeof toContractSignerBodyDto>,
	) => Promise<unknown>;
	updateContractSigner: (
		variables: ReturnType<typeof toContractSignerBodyDto>,
	) => Promise<unknown>;
	signatureUploader: ReturnType<typeof useUploadFile>;
	setFeedbackMessage: (message: string | null) => void;
	setErrorMessage: (message: string | null) => void;
}) {
	setFeedbackMessage(null);
	setErrorMessage(null);

	try {
		let signatureUrl = values.signatureUrl;

		if (values.signatureFile) {
			const preparedSignature = await compressSignatureFile(
				values.signatureFile,
			);
			const uploadResult =
				await signatureUploader.uploadAsync(preparedSignature);
			const uploadedSignatureUrl = buildR2PublicUrl(
				uploadResult.file.objectInfo.key,
				"branding",
			);

			if (!uploadedSignatureUrl) {
				throw new Error("No pudimos generar la URL publica de la firma.");
			}

			signatureUrl = uploadedSignatureUrl;
		}

		const dto = toContractSignerBodyDto({
			...values,
			signatureUrl,
		});

		if (mode === "create") {
			await createContractSigner(dto);
			setFeedbackMessage("Firmante guardado correctamente.");
			return;
		}

		await updateContractSigner(dto);
		setFeedbackMessage("Firmante actualizado correctamente.");
	} catch (error) {
		if (error instanceof ProblemDetailsError) {
			setErrorMessage(error.problemDetails.detail);
			return;
		}

		setErrorMessage(
			error instanceof Error
				? error.message
				: "No pudimos guardar el firmante de contratos.",
		);
	}
}

async function compressSignatureFile(file: File): Promise<File> {
	const { default: imageCompression } = await import(
		"browser-image-compression"
	);

	const compressed = await imageCompression(file, {
		maxWidthOrHeight: 1200,
		fileType: "image/png",
		initialQuality: 0.82,
		maxSizeMB: 3,
	});

	return new File([compressed], file.name.replace(/\.[^.]+$/, ".png"), {
		type: "image/png",
	});
}

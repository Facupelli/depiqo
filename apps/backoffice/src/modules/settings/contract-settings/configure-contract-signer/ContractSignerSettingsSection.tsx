import { useUploadFile } from "@better-upload/client";
import { toast } from "sonner";
import { buildR2PublicUrl } from "@/lib/r2-public-url";
import { ProblemDetailsError } from "@/shared/errors";
import { ContractSignerForm } from "./ContractSignerForm";
import { useContractSigner } from "./contract-signer.queries";
import {
	type ContractSignerFormValues,
	contractSignerToFormValues,
	toContractSignerBodyDto,
} from "./contract-signer-form.schema";
import { useCreateContractSigner } from "./create-contract-signer.mutation";
import { useUpdateContractSigner } from "./update-contract-signer.mutation";

export function ContractSignerSettingsSection() {
	const contractSignerQuery = useContractSigner();
	const { mutateAsync: createContractSigner, isPending: isCreating } =
		useCreateContractSigner();
	const { mutateAsync: updateContractSigner, isPending: isUpdating } =
		useUpdateContractSigner();
	const signatureUploader = useUploadFile({
		api: "/api/branding-upload",
		route: "userSignature",
	});

	if (contractSignerQuery.isPending) {
		return (
			<p className="rounded-xl border bg-card px-5 py-4 text-sm text-muted-foreground">
				Cargando firmante de contratos...
			</p>
		);
	}

	if (contractSignerQuery.isError) {
		return (
			<p className="rounded-xl border bg-card px-5 py-4 text-sm text-destructive">
				{contractSignerQuery.error instanceof ProblemDetailsError
					? contractSignerQuery.error.problemDetails.detail
					: "Ocurrio un error cargando el firmante de contratos."}
			</p>
		);
	}

	const mode = contractSignerQuery.data ? "update" : "create";
	const defaultValues = contractSignerToFormValues(contractSignerQuery.data);
	const formKey = JSON.stringify({
		mode,
		fullName: defaultValues.fullName,
		documentNumber: defaultValues.documentNumber,
		phone: defaultValues.phone,
		address: defaultValues.address,
		signatureUrl: defaultValues.signatureUrl,
	});

	return (
		<ContractSignerForm
			key={formKey}
			defaultValues={defaultValues}
			isPending={isCreating || isUpdating || signatureUploader.isPending}
			onSubmit={async (values) => {
				await handleSubmit({
					mode,
					values,
					createContractSigner,
					updateContractSigner,
					signatureUploader,
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
}: {
	mode: "create" | "update";
	values: ContractSignerFormValues;
	createContractSigner: (
		variables: ReturnType<typeof toContractSignerBodyDto>,
	) => Promise<unknown>;
	updateContractSigner: (
		variables: ReturnType<typeof toContractSignerBodyDto>,
	) => Promise<unknown>;
	signatureUploader: ReturnType<typeof useUploadFile>;
}) {
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
			toast.success("Firmante guardado correctamente.");
			return;
		}

		await updateContractSigner(dto);
		toast.success("Firmante actualizado correctamente.");
	} catch (error) {
		if (error instanceof ProblemDetailsError) {
			toast.error(error.problemDetails.detail ?? error.problemDetails.title);
			return;
		}

		toast.error(
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

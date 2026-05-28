import { uploadFile } from "@better-upload/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ImageOff, LoaderCircle, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { buildR2PublicUrl } from "@/lib/r2-public-url";
import { tenantQueries } from "@/v2/features/tenant-management/tenant/tenant.queries";
import { useUpdateTenantBranding } from "@/v2/features/tenant-management/tenant/update-tenant-branding/update-tenant-branding.mutation";

export function TenantBrandingSection() {
	const { data: tenant } = useSuspenseQuery(tenantQueries.current());
	const [failedLogoPath, setFailedLogoPath] = useState<string | null>(null);
	const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isUploading, setIsUploading] = useState(false);
	const { mutateAsync: updateTenantBranding, isPending: isSaving } =
		useUpdateTenantBranding();

	const logoUrl = tenant.branding.logoUrl;
	const faviconUrl = tenant.branding.faviconUrl;
	const previewUrl = buildR2PublicUrl(logoUrl, "branding");
	const showPreview = Boolean(previewUrl && failedLogoPath !== logoUrl);

	async function persistBranding(branding: {
		logoUrl: string | null;
		faviconUrl: string | null;
	}) {
		setErrorMessage(null);
		setFeedbackMessage(null);

		try {
			await updateTenantBranding({
				...branding,
				accentColor: null,
				primaryColor: null,
				storefrontName: null,
				tagline: null,
			});
			setFailedLogoPath(null);
			setFeedbackMessage(
				branding.logoUrl
					? "Logo guardado correctamente."
					: "Logo eliminado correctamente.",
			);
		} catch (error) {
			setErrorMessage(getMutationErrorMessage(error));
		}
	}

	async function handleUpload(file: File) {
		setErrorMessage(null);
		setFeedbackMessage(null);
		setFailedLogoPath(null);
		setIsUploading(true);

		try {
			const [logoFile, faviconFile] = await Promise.all([
				compressLogoFile(file),
				createFaviconFile(file),
			]);

			const [logoUploadResult, faviconUploadResult] = await Promise.all([
				uploadFile({
					api: "/api/branding-upload",
					route: "brandingLogo",
					file: logoFile,
				}),
				uploadFile({
					api: "/api/branding-upload",
					route: "brandingFavicon",
					file: faviconFile,
				}),
			]);

			await persistBranding({
				logoUrl: logoUploadResult.file.objectInfo.key,
				faviconUrl: faviconUploadResult.file.objectInfo.key,
			});
		} catch (error) {
			setErrorMessage(getUploadErrorMessage(error));
		} finally {
			setIsUploading(false);
		}
	}

	const isBusy = isUploading || isSaving;

	return (
		<section className="space-y-4">
			<div>
				<h2 className="text-xl font-bold">Branding</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					Sube el logo que quieres mostrar en la experiencia del cliente.
				</p>
			</div>

			<div className="rounded-xl border border-border bg-card p-5">
				<div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
					<div className="space-y-4">
						<div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted/40">
							{showPreview ? (
								<img
									key={logoUrl ?? "empty-logo"}
									src={previewUrl ?? undefined}
									alt={`${tenant.name} logo`}
									className="h-full w-full object-contain"
									onError={() => {
										if (logoUrl) {
											setFailedLogoPath(logoUrl);
										}
									}}
								/>
							) : (
								<div className="flex flex-col items-center gap-2 px-4 text-center text-muted-foreground">
									<ImageOff className="h-5 w-5" />
									<p className="text-xs font-medium">
										{logoUrl
											? "No pudimos mostrar el logo actual."
											: "Aun no hay logo cargado."}
									</p>
								</div>
							)}
						</div>

						{feedbackMessage ? (
							<p className="text-sm text-emerald-600">{feedbackMessage}</p>
						) : null}
						{errorMessage ? (
							<p className="text-sm text-destructive">{errorMessage}</p>
						) : null}
					</div>

					<div className="flex flex-col gap-3 md:items-end">
						<label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50">
							<input
								type="file"
								accept="image/*"
								className="absolute inset-0 size-0 opacity-0"
								disabled={isBusy}
								onChange={(event) => {
									const file = event.target.files?.[0];
									if (file) {
										void handleUpload(file);
									}
									event.target.value = "";
								}}
							/>
							{isUploading ? (
								<LoaderCircle className="h-4 w-4 animate-spin" />
							) : (
								<Upload className="h-4 w-4" />
							)}
							<span>{isUploading ? "Subiendo..." : "Subir logo"}</span>
						</label>

						<Button
							type="button"
							variant="outline"
							disabled={(!logoUrl && !faviconUrl) || isBusy}
							onClick={() => {
								void persistBranding({
									logoUrl: null,
									faviconUrl: null,
								});
							}}
						>
							{isSaving ? (
								<LoaderCircle className="h-4 w-4 animate-spin" />
							) : (
								<Trash2 className="h-4 w-4" />
							)}
							<span>{isSaving ? "Guardando..." : "Eliminar logo"}</span>
						</Button>
					</div>
				</div>
			</div>
		</section>
	);
}

async function compressLogoFile(file: File): Promise<File> {
	const { default: imageCompression } = await import(
		"browser-image-compression"
	);

	const compressed = await imageCompression(file, {
		maxWidthOrHeight: 1200,
		fileType: "image/webp",
		initialQuality: 0.82,
		maxSizeMB: 3,
	});

	return new File([compressed], file.name.replace(/\.[^.]+$/, ".webp"), {
		type: "image/webp",
	});
}

async function createFaviconFile(file: File): Promise<File> {
	const dataUrl = await readFileAsDataUrl(file);
	const sourceImage = await loadImage(dataUrl);
	const outputSize = 64;
	const outputPadding = 4;
	const internalSize = 256;
	const internalPadding = (outputPadding / outputSize) * internalSize;
	const internalCanvas = document.createElement("canvas");
	internalCanvas.width = internalSize;
	internalCanvas.height = internalSize;

	const internalContext = internalCanvas.getContext("2d");

	if (!internalContext) {
		throw new Error("No pudimos generar el favicon.");
	}

	const drawableInternalSize = internalSize - internalPadding * 2;
	const scale = Math.min(
		drawableInternalSize / sourceImage.width,
		drawableInternalSize / sourceImage.height,
	);
	const scaledWidth = sourceImage.width * scale;
	const scaledHeight = sourceImage.height * scale;
	const offsetX = (internalSize - scaledWidth) / 2;
	const offsetY = (internalSize - scaledHeight) / 2;

	internalContext.imageSmoothingEnabled = true;
	internalContext.imageSmoothingQuality = "high";
	internalContext.clearRect(0, 0, internalSize, internalSize);
	internalContext.drawImage(
		sourceImage,
		offsetX,
		offsetY,
		scaledWidth,
		scaledHeight,
	);

	const outputCanvas = document.createElement("canvas");
	outputCanvas.width = outputSize;
	outputCanvas.height = outputSize;

	const outputContext = outputCanvas.getContext("2d");

	if (!outputContext) {
		throw new Error("No pudimos generar el favicon.");
	}

	outputContext.imageSmoothingEnabled = true;
	outputContext.imageSmoothingQuality = "high";
	outputContext.clearRect(0, 0, outputSize, outputSize);
	outputContext.drawImage(internalCanvas, 0, 0, outputSize, outputSize);

	const blob = await new Promise<Blob | null>((resolve) => {
		outputCanvas.toBlob(resolve, "image/png");
	});

	if (!blob) {
		throw new Error("No pudimos generar el favicon.");
	}

	return new File([blob], file.name.replace(/\.[^.]+$/, ".png"), {
		type: "image/png",
	});
}

function readFileAsDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onload = () => {
			if (typeof reader.result === "string") {
				resolve(reader.result);
				return;
			}

			reject(new Error("No pudimos leer el archivo seleccionado."));
		};

		reader.onerror = () => {
			reject(new Error("No pudimos leer el archivo seleccionado."));
		};

		reader.readAsDataURL(file);
	});
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error("No pudimos procesar el logo."));
		image.src = src;
	});
}

const FILE_TOO_LARGE_MESSAGE =
	"El logo debe pesar menos de 3MB después de la compresión.";
const GENERIC_UPLOAD_ERROR_MESSAGE =
	"No pudimos subir el logo. Intenta nuevamente.";
const GENERIC_SAVE_ERROR_MESSAGE =
	"No pudimos guardar el logo. Intenta nuevamente.";

function getUploadErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		if (error.message.toLowerCase().includes("size")) {
			return FILE_TOO_LARGE_MESSAGE;
		}

		return error.message;
	}

	return GENERIC_UPLOAD_ERROR_MESSAGE;
}

function getMutationErrorMessage(error: unknown): string {
	if (error instanceof Error && error.message) {
		return error.message;
	}

	return GENERIC_SAVE_ERROR_MESSAGE;
}

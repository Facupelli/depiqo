import { useUploadFile } from "@better-upload/client";
import { buildR2PublicUrl } from "@/lib/r2-public-url";

type Props = {
	onUploadComplete: (path: string) => void;
	currentPath?: string | null;
};

export function CatalogImageUploader({ onUploadComplete, currentPath }: Props) {
	const { upload, isPending, isSuccess, isError } = useUploadFile({
		route: "catalogImages",
		onBeforeUpload: async ({ file }) => {
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
		},
		onUploadComplete: ({ file }) => {
			onUploadComplete(file.objectInfo.key);
		},
	});

	const previewUrl = buildR2PublicUrl(currentPath, "catalog");

	return (
		<div className="flex flex-col gap-3">
			{previewUrl && (
				<img
					src={previewUrl}
					alt="Current upload"
					className="h-40 w-40 rounded-md object-cover"
				/>
			)}

			<label className="relative inline-flex w-fit cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed">
				<input
					type="file"
					accept="image/*"
					className="absolute inset-0 size-0 opacity-0"
					disabled={isPending}
					onChange={(event) => {
						const file = event.target.files?.[0];
						if (file) upload(file);
						event.target.value = "";
					}}
				/>
				{isPending ? "Subiendo…" : "Subir imagen"}
			</label>

			{isSuccess && (
				<p className="text-sm text-green-600">Imagen subida exitosamente.</p>
			)}
			{isError && (
				<p className="text-sm text-red-500">
					La subida de la imagen ha fallado. Intenta de nuevo.
				</p>
			)}
		</div>
	);
}

import type { useUploadFile } from "@better-upload/client";
import { Button } from "@/components/ui/button";
import { UploadDropzone } from "@/components/ui/upload-dropzone";

type ImageUploadFieldProps = {
	uploader: ReturnType<typeof useUploadFile>;
	value: File | null;
	onChange: (file: File | null) => void;
	id?: string;
	accept?: string;
	description?: { fileTypes: string; maxFileSize: string };
};

export function ImageUploadField({
	uploader,
	value,
	onChange,
	id,
	accept = "image/*",
	description = { fileTypes: "JPEG, PNG, GIF", maxFileSize: "5MB" },
}: ImageUploadFieldProps) {
	return (
		<div>
			{value ? (
				<div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
					<span className="truncate text-muted-foreground">{value.name}</span>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => {
							onChange(null);
							uploader.reset();
						}}
					>
						Remove
					</Button>
				</div>
			) : (
				<UploadDropzone
					id={id}
					control={uploader.control}
					accept={accept}
					description={description}
					uploadOverride={(files) => {
						const file = files[0];
						if (file) onChange(file);
					}}
				/>
			)}
		</div>
	);
}

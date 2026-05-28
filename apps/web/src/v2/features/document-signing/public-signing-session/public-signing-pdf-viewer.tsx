type PublicSigningPdfViewerProps = {
	src: string;
	documentNumber: string | null;
};

export function PublicSigningPdfViewer({
	src,
	documentNumber,
}: PublicSigningPdfViewerProps) {
	return (
		<div className="h-full overflow-hidden bg-white shadow-sm sm:border-2 sm:border-neutral-950">
			<iframe
				title={`Contrato ${documentNumber ?? "para firma"}`}
				src={src}
				className="h-full w-full bg-white"
			/>
		</div>
	);
}

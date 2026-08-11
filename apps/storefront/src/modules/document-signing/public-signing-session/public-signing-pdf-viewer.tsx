import { Button } from "@repo/ui/components/button";

type PublicSigningPdfViewerProps = {
	objectUrl: string;
	documentName: string;
	documentNumber: string | null;
};

export function PublicSigningPdfViewer({
	objectUrl,
	documentName,
	documentNumber,
}: PublicSigningPdfViewerProps) {
	return (
		<section className="space-y-3" aria-label="Contrato para revisar">
			<div className="h-[70svh] min-h-120 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
				<iframe
					title={`Contrato ${documentNumber ?? "para firma"}`}
					src={objectUrl}
					className="h-full w-full bg-white"
				/>
			</div>
			<div className="flex flex-wrap gap-3">
				<Button
					variant="outline"
					render={
						<a href={objectUrl} target="_blank" rel="noreferrer">
							Abrir documento
						</a>
					}
				/>
				<Button
					variant="outline"
					render={
						<a href={objectUrl} download={documentName}>
							Descargar documento
						</a>
					}
				/>
			</div>
		</section>
	);
}

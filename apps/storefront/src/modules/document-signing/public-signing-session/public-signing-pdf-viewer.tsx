import { memo, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
	"pdfjs-dist/build/pdf.worker.min.mjs",
	import.meta.url,
).toString();

type PublicSigningPdfViewerProps = {
	file: Blob;
	documentNumber: string | null;
};

export const PublicSigningPdfViewer = memo(function PublicSigningPdfViewer({
	file,
	documentNumber,
}: PublicSigningPdfViewerProps) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [containerWidth, setContainerWidth] = useState(0);
	const [pageCount, setPageCount] = useState<number | null>(null);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const updateWidth = () => setContainerWidth(container.clientWidth);
		const resizeObserver = new ResizeObserver(updateWidth);
		resizeObserver.observe(container);
		updateWidth();

		return () => resizeObserver.disconnect();
	}, []);

	const pageWidth = Math.min(Math.max(containerWidth - 24, 1), 880);

	return (
		<section
			ref={containerRef}
			aria-label={`Remito ${documentNumber ?? "para firma"}`}
			className="min-h-[calc(100svh-4rem)] bg-neutral-200/70 px-3 py-5 sm:px-6 sm:py-8"
		>
			<Document
				file={file}
				onLoadSuccess={({ numPages }) => setPageCount(numPages)}
				loading={<DocumentPageSkeleton />}
				error={
					<div className="mx-auto max-w-md rounded-lg border border-neutral-300 bg-white p-5 text-center text-sm text-neutral-600 shadow-sm">
						No pudimos mostrar el documento. Intenta recargar la página.
					</div>
				}
				className="grid justify-items-center gap-4 sm:gap-6"
			>
				{pageCount
					? Array.from({ length: pageCount }, (_, index) => (
							<figure key={`page-${index + 1}`} className="m-0 grid gap-2">
								<Page
									pageNumber={index + 1}
									width={pageWidth}
									renderAnnotationLayer={false}
									renderTextLayer={false}
									loading={<DocumentPageSkeleton width={pageWidth} />}
									className="overflow-hidden bg-white shadow-[0_1px_3px_rgba(0,0,0,0.14),0_12px_32px_rgba(0,0,0,0.08)] [&_canvas]:block [&_canvas]:h-auto! [&_canvas]:max-w-full!"
								/>
								{pageCount > 1 ? (
									<figcaption className="text-center text-xs font-medium text-neutral-500">
										{index + 1} / {pageCount}
									</figcaption>
								) : null}
							</figure>
						))
					: null}
			</Document>
		</section>
	);
});

function DocumentPageSkeleton({ width }: { width?: number }) {
	return (
		<output
			className="mx-auto block aspect-[210/297] w-full max-w-[880px] animate-pulse bg-white shadow-sm"
			style={width ? { width } : undefined}
			aria-label="Preparando páginas del documento"
		/>
	);
}

import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";

interface SectionErrorFallbackProps {
	message?: string;
	resetErrorBoundary: () => void;
}

function SectionErrorFallback({
	message = "This section could not be loaded.",
	resetErrorBoundary,
}: SectionErrorFallbackProps) {
	return (
		<div className="flex min-h-64 w-full flex-col items-center justify-center rounded-sm bg-neutral-50 px-6 py-12 text-center">
			{/* Warning icon */}
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="28"
				height="28"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.25"
				strokeLinecap="round"
				strokeLinejoin="round"
				className="mb-5 text-neutral-300"
				aria-hidden="true"
			>
				<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
				<line x1="12" y1="9" x2="12" y2="13" />
				<line x1="12" y1="17" x2="12.01" y2="17" />
			</svg>

			<h3 className="mb-2 text-base font-semibold text-neutral-800">
				Algo salió mal
			</h3>

			<p className="mb-7 max-w-xs text-sm leading-relaxed text-neutral-400">
				{message}
			</p>

			<button
				onClick={resetErrorBoundary}
				className="border border-neutral-800 px-6 py-2 text-xs font-medium tracking-[0.15em] text-neutral-800 uppercase transition-colors hover:bg-neutral-800 hover:text-white"
			>
				Intentar de nuevo
			</button>
		</div>
	);
}

interface SectionErrorBoundaryProps {
	children: React.ReactNode;
	message?: string;
}

export function SectionErrorBoundary({
	children,
	message,
}: SectionErrorBoundaryProps) {
	const { reset } = useQueryErrorResetBoundary();

	return (
		<ErrorBoundary
			onReset={reset}
			fallbackRender={({ resetErrorBoundary }) => (
				<SectionErrorFallback
					message={message}
					resetErrorBoundary={resetErrorBoundary}
				/>
			)}
		>
			{children}
		</ErrorBoundary>
	);
}

import { Button } from "@/components/ui/button";

type GenericErrorPageProps = {
	title?: string;
	message?: string;
	onRetry?: () => void;
	retryLabel?: string;
};

export function GenericErrorPage({
	title = "Ocurrio un error",
	message = "No pudimos cargar esta pagina en este momento. Intenta nuevamente.",
	onRetry,
	retryLabel = "Reintentar",
}: GenericErrorPageProps) {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
			<div className="flex max-w-md flex-col items-center text-center">
				<p className="mb-6 text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">
					Error
				</p>

				<div className="mb-8 flex h-16 w-16 items-center justify-center border border-neutral-300 text-neutral-900">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-hidden="true"
					>
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</div>

				<h1 className="mb-4 text-3xl font-semibold tracking-tight text-neutral-900">
					{title}
				</h1>

				<p className="mb-10 text-sm leading-relaxed text-neutral-500">
					{message}
				</p>

				<Button
					type="button"
					onClick={onRetry ?? (() => window.location.reload())}
					className="bg-neutral-900 px-6 py-2.5 text-xs font-medium uppercase tracking-[0.15em] text-white hover:bg-neutral-700"
				>
					{retryLabel}
				</Button>
			</div>
		</div>
	);
}

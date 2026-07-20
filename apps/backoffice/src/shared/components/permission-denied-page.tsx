import { Button } from "@/components/ui/button";

type PermissionDeniedPageProps = {
	title?: string;
	message?: string;
	onBack?: () => void;
	backLabel?: string;
};

export function PermissionDeniedPage({
	title = "Acceso denegado",
	message = "No tienes permisos para ver esta pagina.",
	onBack,
	backLabel = "Volver",
}: PermissionDeniedPageProps) {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
			<div className="flex max-w-md flex-col items-center text-center">
				<p className="mb-6 text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">
					Error 403
				</p>

				<div className="mb-8 flex h-16 w-16 items-center justify-center border border-neutral-300 text-neutral-900">
					<span className="text-lg font-medium">403</span>
				</div>

				<h1 className="mb-4 text-3xl font-semibold tracking-tight text-neutral-900">
					{title}
				</h1>

				<p className="mb-10 text-sm leading-relaxed text-neutral-500">
					{message}
				</p>

				<Button
					type="button"
					onClick={onBack ?? (() => window.history.back())}
					className="bg-neutral-900 px-6 py-2.5 text-xs font-medium uppercase tracking-[0.15em] text-white hover:bg-neutral-700"
				>
					{backLabel}
				</Button>
			</div>
		</div>
	);
}

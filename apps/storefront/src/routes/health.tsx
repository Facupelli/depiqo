import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ShellPage, ShellPanel, ShellRule } from "@/components/shell-page";
import { getHealthStatus } from "@/modules/health/get-health-status.function";

export const Route = createFileRoute("/health")({
	loader: () => getHealthStatus(),
	component: HealthPage,
});

function HealthPage() {
	const { status } = Route.useLoaderData();
	const [isHydrated, setIsHydrated] = useState(false);

	return (
		<ShellPage
			footer={
				<footer className="self-end pt-12 font-mono text-[0.7rem] tracking-[0.14em] text-[#59584e] uppercase">
					Depiqo · Equipment Rental
				</footer>
			}
		>
			<ShellPanel>
				<div className="mb-8 flex items-center gap-2.5 font-mono text-[0.7rem] tracking-[0.14em] uppercase">
					<span
						className="size-2.5 rounded-full bg-[#5c8f51] shadow-[0_0_0_4px_rgba(92,143,81,0.16)]"
						aria-hidden="true"
					/>
					<span>Estado: {status}</span>
				</div>
				<ShellRule />
				<p className="mb-5 font-mono text-[0.7rem] tracking-[0.14em] text-[#59584e] uppercase">
					Storefront de Depiqo
				</p>
				<h1 className="max-w-[12ch] font-serif text-5xl leading-[0.94] font-normal tracking-[-0.055em] sm:text-7xl lg:text-8xl">
					El servicio está operativo.
				</h1>
				<p className="my-8 max-w-lg font-sans text-[0.95rem] leading-7 text-[#59584e]">
					Esta página confirma el renderizado del servidor y la conexión con el
					navegador.
				</p>
				<button
					className="inline-flex min-h-11 cursor-pointer items-center justify-center border border-[#171713] bg-[#171713] px-4 py-3 font-mono text-xs tracking-[0.08em] text-[#f7f6f0] uppercase transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#d7d32f] hover:text-[#171713] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[#4f6eff] motion-reduce:transition-none"
					type="button"
					onClick={() => setIsHydrated(true)}
				>
					{isHydrated ? "Hidratación activa" : "Comprobar hidratación"}
				</button>
			</ShellPanel>
		</ShellPage>
	);
}

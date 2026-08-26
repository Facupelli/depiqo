import { Link } from "@tanstack/react-router";
import { ShellPage, ShellPanel, ShellRule } from "./shell-page";

export function NotFoundPage() {
	return (
		<ShellPage>
			<ShellPanel>
				<p className="mb-5 font-mono text-[0.7rem] tracking-[0.14em] text-[#59584e] uppercase">
					Error 404
				</p>
				<ShellRule />
				<h1 className="max-w-[12ch] font-serif text-5xl leading-[0.94] font-normal tracking-[-0.055em] sm:text-7xl lg:text-8xl">
					Esta página no existe.
				</h1>
				<p className="my-8 max-w-lg font-sans text-[0.95rem] leading-7 text-[#59584e]">
					La dirección solicitada no pertenece al storefront de Depiqo.
				</p>
				<Link
					className="inline-flex min-h-11 items-center justify-center border border-[#171713] bg-[#171713] px-4 py-3 font-mono text-xs tracking-[0.08em] text-[#f7f6f0] uppercase transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#d7d32f] hover:text-[#171713] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[#4f6eff] motion-reduce:transition-none"
					to="/health"
				>
					Comprobar el servicio
				</Link>
			</ShellPanel>
		</ShellPage>
	);
}

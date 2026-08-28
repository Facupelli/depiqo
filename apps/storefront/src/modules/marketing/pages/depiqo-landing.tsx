import { buildR2PublicUrl } from "@/lib/r2-public-url";

const depiqoLogoUrl = buildR2PublicUrl(
	"depiqo/depiqo-logo-horizontal.webp",
	"branding",
);

export function DepiqoLandingPage() {
	return (
		<div className="relative grid min-h-dvh grid-rows-[auto_1fr] overflow-hidden bg-[#f8f8f4] text-[#17201d]">
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,rgba(106,159,140,0.12),transparent_32rem)]"
			/>

			<header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-8 sm:py-7 lg:px-12">
				<img
					src={depiqoLogoUrl ?? undefined}
					alt="Depiqo"
					className="h-auto w-32 sm:w-36"
				/>
				<a
					href="https://app.depiqo.com/login"
					className="rounded-full border border-[#17201d]/20 px-5 py-2.5 text-sm font-semibold tracking-tight transition-colors hover:border-[#1d4ed8] hover:bg-[#1d4ed8] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#17201d]"
				>
					Ingresar
				</a>
			</header>

			<main className="relative z-10 grid place-items-center px-6 pb-24 pt-10 text-center sm:pb-32">
				<div className="max-w-4xl">
					<h1 className="text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl md:text-7xl lg:text-[5.5rem]">
						Gestión de alquileres, simplificado.
					</h1>
					<p className="mx-auto mt-7 max-w-2xl text-pretty text-lg leading-relaxed text-[#52605b] sm:mt-8 sm:text-xl">
						Inventario, alquileres y operación en un solo lugar.
					</p>
				</div>
			</main>
		</div>
	);
}

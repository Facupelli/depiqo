import { Link } from "@tanstack/react-router";
import { ArrowRight, MessageCircle, Truck, UserCog, Video } from "lucide-react";
import type { TenantBranding } from "@/modules/tenant-management/tenant-branding/tenant-branding";

const SERVICES = [
	{
		icon: <Video size={28} strokeWidth={1.5} />,
		label: "Servicios de Producción",
	},
	{ icon: <Truck size={28} strokeWidth={1.5} />, label: "Transporte" },
	{
		icon: <UserCog size={28} strokeWidth={1.5} />,
		label: "Técnicos Especializados",
	},
];

const WHATSAPP_HREF = "https://wa.me/34680870274";

export function GuaridaRentalLandingPage({
	branding,
}: {
	branding: TenantBranding;
}) {
	return (
		<>
			<style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .anim-1 { animation: fadeInUp 0.8s ease forwards; animation-delay: 0.10s; opacity: 0; }
        .anim-2 { animation: fadeInUp 0.8s ease forwards; animation-delay: 0.30s; opacity: 0; }
        .anim-3 { animation: fadeInUp 0.8s ease forwards; animation-delay: 0.50s; opacity: 0; }
        .anim-4 { animation: fadeInUp 0.8s ease forwards; animation-delay: 0.70s; opacity: 0; }
        .anim-5 { animation: fadeInUp 0.8s ease forwards; animation-delay: 0.90s; opacity: 0; }
        .anim-6 { animation: fadeIn   1.0s ease forwards; animation-delay: 1.10s; opacity: 0; }
      `}</style>

			{/* ── Root ── */}
			<section className="relative min-h-svh w-full overflow-hidden">
				{/* ── Background image: grayscale + lighter than before ── */}
				<img
					src="https://images.pexels.com/photos/2512258/pexels-photo-2512258.jpeg"
					alt="Dark film studio interior"
					className="absolute inset-0 w-full h-full object-cover object-center grayscale brightness-[0.38] contrast-[1.15]"
				/>

				{/* ── Dark vignette: edges darker, center breathes ── */}
				<div className="absolute inset-0 bg-[radial-gradient(ellipse_65%_55%_at_50%_45%,rgba(0,0,0,0.2)_0%,rgba(0,0,0,0.65)_60%,rgba(0,0,0,0.88)_100%)]" />

				{/* ── Grain texture ── */}
				<div
					className="absolute inset-0 opacity-[0.035] pointer-events-none"
					style={{
						backgroundImage:
							"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
						backgroundRepeat: "repeat",
						backgroundSize: "128px",
					}}
				/>

				{/* ── Sidebar coordinate text ── */}
				<div
					className="anim-6 pointer-events-none absolute top-1/2 left-0 hidden flex-col items-center gap-2 select-none pl-3 md:flex"
					style={{
						writingMode: "vertical-rl",
						transform: "translateY(-50%) rotate(180deg)",
					}}
				>
					<span className=" text-[9px] font-light tracking-[0.25em] uppercase text-white/25">
						COORD.REF
					</span>
					<span className=" text-[9px] font-light tracking-[0.2em] text-white/15">
						40.4168° N, 3.7038° W
					</span>
				</div>

				{/* ── Content grid: nav / main / footer ── */}
				<div className="relative z-10 grid min-h-svh grid-rows-[auto_1fr_auto]">
					{/* ── Navbar ── */}
					<nav className="flex items-center justify-between bg-black/80 px-4 py-2.5 md:px-10 md:py-5 backdrop-blur-sm">
						{branding.logoSrc ? (
							// <div className="bg-neutral-50 p-2 rounded-md">
							<img
								src={branding.logoSrc}
								alt={branding.tenantName}
								className="h-8 md:h-12 w-auto max-w-48 object-contain"
							/>
						) : (
							// </div>
							<span className="text-white text-xl md:text-2xl tracking-widest select-none">
								{branding.tenantName}
							</span>
						)}

						<Link
							to="/rental"
							className="
				       bg-[#C85C3E] px-4 py-1.5 text-[11px] font-bold tracking-[0.15em] text-white uppercase
				       transition-colors duration-200 hover:bg-[#a84a2f] md:px-6 md:py-2.5
				     "
						>
							Ver catálogo
						</Link>
					</nav>

					{/* ── Hero ── */}
					<main className="flex min-h-0 flex-col justify-end px-6 pt-3 pb-6 text-left md:items-center md:justify-center md:gap-6 md:px-6 md:pt-0 md:pb-0 md:text-center">
						{/* "MADRID CENTRO" label */}
						<div className="anim-1 flex items-center gap-3 self-start md:self-center">
							<span className="block h-px w-8 bg-[#C85C3E] md:w-10" />
							<span className="text-[10px] font-semibold tracking-[0.3em] text-[#C85C3E] uppercase md:text-sm md:tracking-[0.35em]">
								MADRID CENTRO
							</span>
							<span className="block h-px w-8 bg-[#C85C3E] md:w-10" />
						</div>

						{/* Main headline */}
						<h1 className="anim-2 pt-1 text-[clamp(2.5rem,13vw,5.4rem)] leading-[0.9] font-semibold tracking-[-0.04em] text-white uppercase md:mt-0 md:max-w-none md:text-[clamp(3rem,8vw,7.5rem)] md:tracking-wide">
							No somos un
							<br />
							simple rental
						</h1>

						{/* Subheadline */}
						<p className="anim-3 mt-4 max-w-[18rem] text-[14px] font-semibold tracking-[0.24em] uppercase text-white/70 md:mt-0 md:max-w-4xl md:text-xl md:tracking-[0.28em]">
							LOS COMBOS MÁS BARATOS DE MADRID
						</p>

						{/* Service icons */}
						<div className="anim-4 mt-6 grid gap-4 md:mt-4 md:grid-cols-3 md:gap-10">
							{SERVICES.map(({ icon, label }) => (
								<div
									key={label}
									className="flex items-center gap-4 md:flex-col md:gap-3"
								>
									<div className="flex size-12 items-center rounded-md justify-center bg-white/4 text-[#F4A79A] md:size-auto md:bg-transparent md:text-[#C85C3E]">
										{icon}
									</div>
									<span className="text-[14px] font-semibold tracking-[0.04em] text-white/70 uppercase md:text-base md:font-light md:tracking-wider md:normal-case md:text-white/60">
										{label}
									</span>
								</div>
							))}
						</div>

						{/* CTA */}
						<Link
							to="/rental"
							className="anim-5 mt-5 flex w-full max-w-100 items-stretch self-start md:mt-4 md:w-auto md:max-w-none md:self-center"
						>
							<span
								className="
							  flex-1 bg-[#C85C3E] px-4 py-2 text-left text-lg font-bold tracking-[0.06em] text-white uppercase
							 transition-colors duration-200 hover:bg-[#a84a2f] md:px-10 md:py-4 md:text-base md:tracking-[0.18em] md:text-center
						   "
							>
								Explorar catálogo
							</span>
							<div className="flex items-center justify-center border-l border-white/10 bg-[#C85C3E] px-6 md:bg-white/[0.07] md:px-5">
								<ArrowRight
									size={26}
									className="text-white"
									strokeWidth={1.5}
								/>
							</div>
						</Link>
					</main>

					<a
						href={WHATSAPP_HREF}
						target="_blank"
						rel="noreferrer"
						className="flex items-center justify-center gap-2 rounded-sm bg-neutral-900 px-2 py-3 text-center md:gap-4 md:px-8"
					>
						<div className="flex size-6 md:size-8 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-black">
							<MessageCircle className="size-4 md:size-5" />
						</div>
						<span className="text-[10px] md:text-[12px] font-medium md:tracking-[0.22em] text-white/55 uppercase">
							No encontrás tu combo?
						</span>
						<span className="text-[10px] md:text-[12px] font-medium md:tracking-[0.18em] text-[#C85C3E] uppercase">
							Escribinos y te lo armamos
						</span>
					</a>

					{/* ── Footer ── */}
					<footer className="hidden items-end justify-between px-10 py-6 md:flex">
						<p className=" text-[10px] font-light tracking-[0.18em] uppercase text-white/30">
							©{new Date().getFullYear()}{" "}
							<strong className="font-semibold text-white/45">
								{branding.tenantName}
							</strong>
							. MADRID.
						</p>

						<a
							href="https://www.instagram.com/guarida.rental/"
							target="_blank"
							rel="noreferrer"
							className="text-[10px] font-medium tracking-[0.2em] uppercase text-white/35 transition-colors duration-200 hover:text-white/70"
						>
							Instagram
						</a>
					</footer>
				</div>
			</section>
		</>
	);
}

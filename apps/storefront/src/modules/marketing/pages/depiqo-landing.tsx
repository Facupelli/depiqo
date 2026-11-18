/* biome-ignore-all lint/correctness/useUniqueElementIds: This singleton route uses stable IDs for public section anchors and their headings. */
import { buttonVariants } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { ArrowUpRight, Plus } from "lucide-react";
import type { ReactNode } from "react";
import {
	ContractPreview,
	EditPreview,
	KitPreview,
	PricingPreview,
} from "../components/feature-previews";
import { ReservationDemo } from "../components/reservation-demo";

const registerUrl = "https://app.depiqo.com/register";
const customerUrl = "https://www.guaridarental.com/";
const headingClass =
	"mb-[15px] text-balance text-[32px] font-bold leading-[1.13] tracking-[-1.5px] min-[641px]:text-[clamp(30px,3.8vw,48px)]";
const sectionClass =
	"scroll-mt-5 border-t border-[#f0f2f6] py-12 pb-16 min-[641px]:py-16 min-[641px]:pb-20";
const introClass =
	"mb-[22px] max-w-[700px] text-sm leading-[1.65] text-muted-foreground min-[641px]:mb-[35px] min-[641px]:text-[15px]";

function Eyebrow({ children }: { children: ReactNode }) {
	return (
		<p className="text-[10px] font-bold uppercase tracking-[1.3px] text-primary">
			{children}
		</p>
	);
}

function CreateAccountLink({ arrow = false }: { arrow?: boolean }) {
	return (
		<a
			href={registerUrl}
			className={cn(
				buttonVariants(),
				"h-auto gap-[11px] rounded-lg px-3 py-2 font-bold hover:bg-[#0b48c6]",
			)}
		>
			Crear cuenta
			{arrow && <ArrowUpRight aria-hidden="true" />}
		</a>
	);
}

function DepiqoLogo({ className }: { className?: string }) {
	return (
		<a
			href="#top"
			aria-label="Depiqo, inicio"
			className="shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
		>
			<img
				src="/marketing/depiqo-logo-horizontal.webp"
				alt="Depiqo"
				width={1242}
				height={384}
				className={cn("h-auto w-[100px] min-[641px]:w-[114px]", className)}
			/>
		</a>
	);
}

function CustomerSection() {
	return (
		<section
			className={sectionClass}
			id="customer"
			aria-labelledby="customer-title"
		>
			<div className="grid items-center gap-6 min-[641px]:grid-cols-[.85fr_1.15fr] min-[821px]:gap-16">
				<div>
					<Eyebrow>Un negocio real</Eyebrow>
					<h2 id="customer-title" className={`${headingClass} max-w-[430px]`}>
						Así se ve un catálogo de alquiler en funcionamiento.
					</h2>
					<p className="mb-6 max-w-[410px] text-sm leading-[1.65] text-muted-foreground min-[641px]:text-base">
						Guarida Rental alquila equipos audiovisuales en Madrid. Conocé su
						tienda online.
					</p>
					<div className="mb-6 flex items-center gap-3">
						<span
							aria-hidden="true"
							className="flex size-[42px] items-center justify-center rounded-lg bg-[#151515] text-2xl font-bold text-white"
						>
							G
						</span>
						<div>
							<strong className="block text-sm font-bold">
								Guarida Rental
							</strong>
							<p className="mt-0.5 text-xs text-muted-foreground">
								Alquiler audiovisual · Madrid, España
							</p>
						</div>
					</div>
					<a
						href={customerUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-3 border-b border-primary py-2 text-sm font-bold text-primary hover:text-[#0b48c6] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
					>
						Visitar Guarida Rental{" "}
						<ArrowUpRight className="size-4" aria-hidden="true" />
					</a>
				</div>
				<a
					href={customerUrl}
					target="_blank"
					rel="noopener noreferrer"
					aria-label="Abrir la web de Guarida Rental en una pestaña nueva"
					className="block min-w-0 overflow-hidden rounded-xl border border-[#dce3ed] bg-white shadow-[0_18px_44px_rgba(28,44,71,0.09)] transition-[transform,box-shadow] duration-500 hover:-translate-y-[3px] hover:shadow-[0_22px_50px_rgba(28,44,71,0.12)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
				>
					<div className="flex h-[38px] items-center justify-between gap-3 border-b border-[#e9edf3] bg-[#fafbfd] px-3.5 text-xs text-muted-foreground">
						<span className="flex gap-[5px]" aria-hidden="true">
							<i className="size-[7px] rounded-full bg-[#d8dee8]" />
							<i className="size-[7px] rounded-full bg-[#d8dee8]" />
							<i className="size-[7px] rounded-full bg-[#d8dee8]" />
						</span>
						<span>guaridarental.com</span>
						<ArrowUpRight className="size-3" aria-hidden="true" />
					</div>
					<img
						src="/marketing/guarida-rental-screenshot.webp"
						alt="Catálogo online de Guarida Rental con sus combos de equipos audiovisuales"
						width={1440}
						height={899}
						loading="lazy"
						decoding="async"
						className="h-[300px] w-full object-cover object-left-top min-[641px]:h-80"
					/>
				</a>
			</div>
		</section>
	);
}

const features = [
	{
		title: "Equipos y kits",
		copy: "Armá kits con varios equipos y ofrecélos como un solo producto, sin duplicar tu inventario.",
		Preview: KitPreview,
	},
	{
		title: "Tarifas para cada alquiler",
		copy: "Definí precios por hora, día o semana y ajustalos según la duración.",
		Preview: PricingPreview,
	},
	{
		title: "Cambios en los alquileres",
		copy: "Modificá fechas, cantidades o equipos de una reserva y revisá la disponibilidad antes de guardar.",
		Preview: EditPreview,
	},
	{
		title: "Presupuestos y contratos",
		copy: "Prepará presupuestos y enviá contratos para que tus clientes los firmen online.",
		Preview: ContractPreview,
	},
];

const audiences = [
	{
		title: "Audiovisual",
		copy: "Cámaras, lentes e iluminación",
		image: "audiovisual",
	},
	{ title: "Herramientas", copy: "Maquinaria y herramientas", image: "tools" },
	{
		title: "Eventos",
		copy: "Audio, iluminación y escenarios",
		image: "events",
	},
];

const questions = [
	{
		question: "¿Puedo cargar alquileres que recibo por teléfono o WhatsApp?",
		answer:
			"Sí. Podés crearlos desde el panel del negocio. Los alquileres confirmados se tienen en cuenta para las próximas consultas de disponibilidad.",
	},
	{
		question: "¿Tengo que cargar mis equipos primero?",
		answer:
			"Sí. Configurás los equipos que tenés y los productos que ofrecés. A partir de esa información, Depiqo puede evaluar la disponibilidad para cada fecha.",
	},
	{
		question: "¿Puedo cambiar una reserva después de confirmarla?",
		answer:
			"Depiqo permite editar fechas, cantidades y equipos en los casos admitidos. Cuando un cambio afecta la disponibilidad, se vuelve a comprobar antes de aceptarlo.",
	},
];

export function DepiqoLandingPage({ demoMonth }: { demoMonth: string }) {
	return (
		<div className="depiqo-marketing min-h-dvh bg-background text-foreground">
			<a
				href="#top"
				className="sr-only absolute left-2 top-2 z-50 rounded-md border-2 border-primary bg-white px-3 py-2 text-primary focus:not-sr-only focus:absolute"
			>
				Ir al contenido
			</a>
			<div className="mx-auto w-[calc(100%-34px)] max-w-[1080px] min-[641px]:w-[calc(100%-44px)] min-[821px]:w-[calc(100%-64px)]">
				<header className="flex items-center justify-between gap-3 py-[17px] min-[641px]:py-[25px]">
					<DepiqoLogo />
					<nav
						aria-label="Navegación principal"
						className="flex items-center gap-[9px] max-[360px]:[&_a]:px-2 max-[360px]:[&_a]:text-xs min-[641px]:gap-[17px] min-[821px]:gap-[30px]"
					>
						{[
							["#demo", "El producto"],
							["#features", "Funcionalidades"],
							["#customer", "Clientes"],
						].map(([href, label]) => (
							<a
								key={href}
								href={href}
								className="hidden text-xs text-[#526075] hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring min-[641px]:inline"
							>
								{label}
							</a>
						))}
						<a
							href="https://app.depiqo.com/login"
							className={cn(
								buttonVariants({ variant: "outline" }),
								"h-auto rounded-lg px-3 py-2 font-bold text-[#41526a] shadow-none",
							)}
						>
							Ingresar
						</a>
						<CreateAccountLink />
					</nav>
				</header>
				<main id="top" tabIndex={-1}>
					<section
						aria-label="Introducción"
						className="max-w-[680px] pb-9 pt-12 min-[641px]:pb-10"
					>
						<Eyebrow>Software para negocios que alquilan equipos</Eyebrow>
						<h1 className="mb-[23px] mt-[19px] max-w-[680px] text-balance text-4xl font-bold leading-[1.06] tracking-[-1.5px] min-[641px]:text-[clamp(36px,4.4vw,60px)] min-[641px]:tracking-[-2.3px]">
							Alquilá tus equipos sin llevar la disponibilidad en planillas.
						</h1>
						<p className="mb-7 max-w-[620px] text-pretty text-sm leading-[1.65] text-muted-foreground min-[641px]:text-base">
							Ofrecé tus equipos en un catálogo online, recibí reservas y
							consultá qué tenés libre para cada fecha desde Depiqo.
						</p>
						<CreateAccountLink arrow />
					</section>
					<section
						id="demo"
						aria-labelledby="demo-title"
						className={`${sectionClass} pt-8 min-[641px]:pt-8`}
					>
						<div className="max-w-[690px]">
							<h2 id="demo-title" className={headingClass}>
								Del catálogo a tu calendario.
							</h2>
							<p className={introClass}>
								Elegí unas fechas y confirmá la reserva. La misma operación
								aparece en el panel del negocio.
							</p>
						</div>
						<ReservationDemo month={demoMonth} />
					</section>
					<CustomerSection />
					<section
						id="benefits"
						aria-labelledby="benefits-title"
						className="border-t border-[#f0f2f6] py-12 min-[641px]:py-16"
					>
						<div className="grid items-center gap-3 min-[641px]:grid-cols-[1.12fr_.88fr] min-[641px]:gap-[35px] min-[821px]:gap-[86px]">
							<div>
								<Eyebrow>El día a día</Eyebrow>
								<h2
									id="benefits-title"
									className="mt-[17px] max-w-[585px] text-balance text-4xl font-bold leading-[1.12] tracking-[-2px] min-[641px]:text-[clamp(35px,4.2vw,51px)]"
								>
									Una reserva puede llegar de cualquier lado.
								</h2>
							</div>
							<div>
								<p className="text-[15px] leading-[1.85] text-[#66768d] min-[641px]:mt-[13px] min-[641px]:text-base">
									Desde tu catálogo, por teléfono o por WhatsApp. También podés
									cargar un alquiler desde el panel y Depiqo lo tiene en cuenta
									al consultar la disponibilidad.
								</p>
								<p className="mt-[18px] text-[13px] leading-[1.7] text-[#677790] min-[641px]:mt-7">
									Así no necesitás mantener una planilla separada para saber qué
									equipos podés alquilar.
								</p>
							</div>
						</div>
					</section>
					<section
						id="features"
						aria-labelledby="features-title"
						className={sectionClass}
					>
						<div className="mb-[18px]">
							<Eyebrow>Funcionalidades</Eyebrow>
						</div>
						<h2 id="features-title" className={headingClass}>
							Para el trabajo que viene después de la reserva.
						</h2>
						<p className={introClass}>
							Configurá tus productos y precios, gestioná cambios y prepará los
							documentos de cada alquiler.
						</p>
						<div className="grid gap-[18px] min-[641px]:grid-cols-2">
							{features.map(({ title, copy, Preview }) => (
								<article
									key={title}
									className="flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card"
								>
									<div className="px-[25px] pb-[19px] pt-[27px]">
										<h3 className="mb-2 text-xl font-bold leading-7 tracking-[-0.5px]">
											{title}
										</h3>
										<p className="text-sm leading-5 text-muted-foreground min-[641px]:min-h-10">
											{copy}
										</p>
									</div>
									<div
										aria-hidden="true"
										className="mx-4 mb-4 mt-auto flex min-h-44 items-center justify-center rounded-[10px] border border-[#eef2f7] bg-[#f8faff] p-[17px]"
									>
										<Preview />
									</div>
								</article>
							))}
						</div>
					</section>
					<section
						id="audience"
						aria-labelledby="audience-title"
						className={sectionClass}
					>
						<div className="mb-[18px]">
							<Eyebrow>Para tu negocio</Eyebrow>
						</div>
						<h2 id="audience-title" className={headingClass}>
							Para distintos negocios de alquiler.
						</h2>
						<p className={introClass}>
							Cámaras, herramientas o equipos para eventos. Depiqo no depende de
							un tipo específico de equipo.
						</p>
						<div className="grid grid-cols-3 gap-2.5 min-[641px]:gap-4">
							{audiences.map(({ title, copy, image }) => (
								<article key={title} className="min-w-0">
									<div className="flex h-[124px] items-center justify-center rounded-[11px] border border-[#edf0f5] bg-[#f7f9fc] max-[360px]:h-[95px] min-[641px]:h-[188px]">
										<img
											src={`/marketing/${image}.svg`}
											width={180}
											height={125}
											alt=""
											loading="lazy"
											className="h-[75px] w-[180px] max-w-[76%] drop-shadow-[0_7px_8px_rgba(28,48,76,0.08)] max-[360px]:h-[63px] min-[641px]:h-[124px]"
										/>
									</div>
									<h3 className="mt-[13px] text-[11px] font-bold min-[641px]:text-[13px]">
										{title}
									</h3>
									<p className="mt-[3px] hidden text-[11px] text-muted-foreground min-[641px]:block">
										{copy}
									</p>
								</article>
							))}
						</div>
					</section>
					<section
						id="questions"
						aria-labelledby="questions-title"
						className={`${sectionClass} mx-auto max-w-[800px]`}
					>
						<Eyebrow>Preguntas frecuentes</Eyebrow>
						<h2 id="questions-title" className={headingClass}>
							Antes de empezar.
						</h2>
						<div className="mt-6 border-t">
							{questions.map(({ question, answer }) => (
								<details key={question} className="group border-b">
									<summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring min-[641px]:text-base [&::-webkit-details-marker]:hidden">
										{question}
										<Plus
											className="size-[22px] shrink-0 text-primary group-open:rotate-45"
											strokeWidth={1.5}
											aria-hidden="true"
										/>
									</summary>
									<p className="mb-6 max-w-[650px] text-sm leading-[1.7] text-muted-foreground">
										{answer}
									</p>
								</details>
							))}
						</div>
					</section>
					<section
						id="about"
						aria-labelledby="about-title"
						className="border-t border-[#f0f2f6] py-20 text-center"
					>
						<Eyebrow>Depiqo</Eyebrow>
						<h2
							id="about-title"
							className="mx-auto my-4 max-w-[570px] text-balance text-4xl font-bold leading-[1.15] tracking-[-2px] min-[641px]:text-[clamp(34px,4.6vw,49px)]"
						>
							El mismo equipo, muchos alquileres.
						</h2>
						<p className="mx-auto mb-7 max-w-[610px] text-sm leading-[1.75] text-muted-foreground min-[641px]:text-[15px]">
							Un equipo se alquila, vuelve y se alquila otra vez. Depiqo conecta
							tus productos, las reservas y los equipos que tenés para que
							puedas seguir ese movimiento.
						</p>
						<CreateAccountLink arrow />
					</section>
				</main>
				<footer className="flex items-center justify-between gap-4 border-t border-[#eef1f5] py-[23px] text-[11px] text-muted-foreground">
					<DepiqoLogo className="w-20 min-[641px]:w-24" />
					<span>Software para alquiler de equipos</span>
				</footer>
			</div>
		</div>
	);
}

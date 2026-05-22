import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, MessageCircleMore, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTenantBranding } from "@/features/tenant-branding/tenant-branding";

export const Route = createFileRoute(
	"/_portal/_tenant/order-created-contact-team/",
)({
	component: OrderCreatedContactTeamPage,
});

function OrderCreatedContactTeamPage() {
	const { tenantContext } = Route.useRouteContext();
	const branding = getTenantBranding(tenantContext.tenant);

	return (
		<div className="min-h-screen bg-[#f0f0f0] flex flex-col items-center">
			<header className="w-full bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
				<div className="flex items-center gap-2 text-sm font-semibold tracking-widest uppercase text-neutral-900">
					{branding.logoSrc ? (
						<img
							src={branding.logoSrc}
							alt={branding.tenantName}
							className="h-10 w-auto object-contain"
						/>
					) : (
						<span>{branding.tenantName}</span>
					)}
				</div>
				<Button
					className="text-neutral-400 hover:text-neutral-700 transition-colors"
					aria-label="Close"
					nativeButton={false}
					render={
						<Link to="/rental" className="bg-transparent hover:bg-transparent">
							<X className="size-5" />
						</Link>
					}
				/>
			</header>

			<main className="w-full max-w-lg px-4 py-12 animate-fade-in-up">
				<div className="bg-white rounded-2xl shadow-sm border border-neutral-200 px-8 py-10 flex flex-col items-center gap-6 text-center">
					<div className="relative flex items-center justify-center">
						<div className="w-20 h-20 rounded-full bg-amber-100" />
						<div className="absolute w-11 h-11 rounded-full bg-amber-500 flex items-center justify-center shadow-md">
							<AlertCircle className="w-6 h-6 text-white" strokeWidth={2.5} />
						</div>
					</div>

					<div className="space-y-1">
						<h1 className="text-2xl font-bold tracking-tight text-neutral-900">
							Recibimos tu pedido
						</h1>
						<p className="text-sm text-neutral-500">
							No pudimos preparar el mensaje de WhatsApp para continuar la
							comunicación.
						</p>
					</div>

					<div className="w-full space-y-3">
						<InfoCard
							icon={<MessageCircleMore className="w-4 h-4 text-white" />}
							title="Tu pedido ya fue creado"
							description="Nuestro equipo lo recibió correctamente y continuará el seguimiento contigo lo antes posible."
						/>
						<InfoCard
							icon={<AlertCircle className="w-4 h-4 text-white" />}
							title="No fue posible abrir WhatsApp"
							description="Si necesitas ayuda inmediata, ponte en contacto con el negocio. Si no, el equipo te contactará en cuanto pueda."
						/>
					</div>

					<div className="w-full pt-1">
						<Button
							className="w-full bg-neutral-900 hover:bg-neutral-700 text-white font-semibold rounded-xl h-12 text-sm tracking-wide transition-colors"
							nativeButton={false}
							render={<Link to="/rental">Volver al catálogo</Link>}
						/>
					</div>
				</div>
			</main>
		</div>
	);
}

function InfoCard({
	icon,
	title,
	description,
}: {
	icon: React.ReactNode;
	title: string;
	description: string;
}) {
	return (
		<div className="flex items-start gap-4 bg-neutral-50 rounded-xl px-4 py-3.5 border border-neutral-100 text-left">
			<div className="mt-0.5 w-8 h-8 rounded-lg bg-neutral-900 flex items-center justify-center shrink-0">
				{icon}
			</div>
			<div>
				<p className="text-sm font-semibold text-neutral-800">{title}</p>
				<p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
					{description}
				</p>
			</div>
		</div>
	);
}

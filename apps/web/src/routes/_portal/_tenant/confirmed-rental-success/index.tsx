import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, CheckCircle2, Mail, X } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { getTenantBranding } from "@/features/tenant-branding/tenant-branding";

const confirmedRentalSuccessSearchSchema = z.object({
	fulfillmentMethod: z.enum(["PICKUP", "DELIVERY"]).catch("PICKUP"),
	pickupDate: z.string().catch("—"),
	pickupLocation: z.string().catch("—"),
	pickupTime: z.string().catch("—"),
	deliveryAddress: z.string().optional().catch(undefined),
});

export const Route = createFileRoute(
	"/_portal/_tenant/confirmed-rental-success/",
)({
	validateSearch: confirmedRentalSuccessSearchSchema,
	component: ConfirmedRentalSuccessPage,
});

function ConfirmedRentalSuccessPage() {
	const { tenantContext } = Route.useRouteContext();
	const {
		fulfillmentMethod,
		pickupDate,
		pickupLocation,
		pickupTime,
		deliveryAddress,
	} = Route.useSearch();
	const branding = getTenantBranding(tenantContext.tenant);
	const formattedDate = formatPickupDate(pickupDate);

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
				<div className="bg-white rounded-2xl shadow-sm border border-neutral-200 px-8 py-10 flex flex-col items-center gap-6">
					<div className="relative flex items-center justify-center">
						<div className="w-20 h-20 rounded-full bg-neutral-100" />
						<div className="absolute w-11 h-11 rounded-full bg-neutral-900 flex items-center justify-center shadow-md">
							<CheckCircle2 className="w-6 h-6 text-white" strokeWidth={2.5} />
						</div>
					</div>

					<div className="text-center space-y-1">
						<h1 className="text-2xl font-bold tracking-tight text-neutral-900">
							Tu reserva fue confirmada
						</h1>
						<p className="text-sm text-neutral-500">
							El alquiler se creó correctamente y el equipo quedó reservado.
						</p>
					</div>

					<div className="w-full space-y-3">
						<p className="text-sm font-semibold text-neutral-700">
							Próximos pasos
						</p>

						<StepCard
							icon={<Mail className="w-4 h-4 text-white" />}
							title="Confirmación enviada"
							description="Revisa tu correo para obtener el detalle de tu alquiler."
						/>

						<StepCard
							icon={<CalendarCheck className="w-4 h-4 text-white" />}
							title={
								fulfillmentMethod === "DELIVERY"
									? `Coordinaremos la entrega para el ${formattedDate}`
									: `Listo para retirar el equipo el ${formattedDate}`
							}
							description={
								fulfillmentMethod === "DELIVERY"
									? deliveryAddress
										? `Usaremos la dirección indicada: ${deliveryAddress}.`
										: "Nos pondremos en contacto para confirmar los detalles de entrega."
									: `Visita ${pickupLocation} a las ${pickupTime}hs.`
							}
						/>
					</div>

					<div className="w-full space-y-2 pt-1">
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

interface StepCardProps {
	icon: React.ReactNode;
	title: string;
	description: string;
}

function StepCard({ icon, title, description }: StepCardProps) {
	return (
		<div className="flex items-start gap-4 bg-neutral-50 rounded-xl px-4 py-3.5 border border-neutral-100">
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

function formatPickupDate(dateStr: string): string {
	try {
		const date = new Date(`${dateStr}T00:00:00`);
		return date.toLocaleDateString("es-ES", { month: "long", day: "numeric" });
	} catch {
		return dateStr;
	}
}

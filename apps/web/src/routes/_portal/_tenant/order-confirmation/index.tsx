import { BookingMode, OrderStatus } from "@repo/types";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Clock3, Mail, CalendarCheck, X } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { resolveOrderConfirmationStatus } from "@/features/rental/checkout/booking-mode-copy";
import { getTenantBranding } from "@/features/tenant-branding/tenant-branding";

const orderConfirmationSearchSchema = z.object({
	pickupDate: z.string().catch("—"),
	pickupLocation: z.string().catch("—"),
	pickupTime: z.string().catch("—"),
	status: z.enum(OrderStatus).optional().catch(undefined),
	bookingMode: z.enum(BookingMode).optional().catch(undefined),
});

export const Route = createFileRoute("/_portal/_tenant/order-confirmation/")({
	validateSearch: orderConfirmationSearchSchema,
	component: OrderConfirmationPage,
});

function OrderConfirmationPage() {
	const { tenantContext } = Route.useRouteContext();

	const { pickupDate, pickupLocation, pickupTime, status, bookingMode } =
		Route.useSearch();

	const formattedDate = formatPickupDate(pickupDate);
	const branding = getTenantBranding(tenantContext.tenant);
	const orderStatus = resolveOrderConfirmationStatus({
		status,
		bookingMode,
	});
	const isPendingReview = orderStatus === OrderStatus.PENDING_REVIEW;

	return (
		<div className="min-h-screen bg-[#f0f0f0] flex flex-col items-center ">
			{/* ── Top bar ── */}
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
				></Button>
			</header>

			{/* ── Card ── */}
			<main className="w-full max-w-lg px-4 py-12 animate-fade-in-up">
				<div className="bg-white rounded-2xl shadow-sm border border-neutral-200 px-8 py-10 flex flex-col items-center gap-6">
					{/* Success icon */}
					<div className="relative flex items-center justify-center">
						<div className="w-20 h-20 rounded-full bg-neutral-100" />
						<div className="absolute w-11 h-11 rounded-full bg-neutral-900 flex items-center justify-center shadow-md">
							<CheckCircle2 className="w-6 h-6 text-white" strokeWidth={2.5} />
						</div>
					</div>

					{/* Heading */}
					<div className="text-center space-y-1">
						<h1 className="text-2xl font-bold tracking-tight text-neutral-900">
							{isPendingReview
								? "Tu solicitud fue enviada"
								: "Tu reserva fue confirmada"}
						</h1>
						<p className="text-sm text-neutral-500">
							{isPendingReview
								? "El negocio revisará tu solicitud y confirmará disponibilidad."
								: "Ya puedes continuar con los próximos pasos de tu alquiler."}
						</p>
					</div>

					{/* Next Steps */}
					<div className="w-full space-y-3">
						<p className="text-sm font-semibold text-neutral-700">
							Próximos pasos
						</p>

						{isPendingReview ? (
							<>
								<StepCard
									icon={<Clock3 className="w-4 h-4 text-white" />}
									title="El negocio revisará tu solicitud"
									description="Confirmará disponibilidad antes de aprobar la reserva."
								/>

								<StepCard
									icon={<CalendarCheck className="w-4 h-4 text-white" />}
									title="El equipo todavía no queda reservado"
									description={`Tu solicitud es para ${formattedDate} en ${pickupLocation} a las ${pickupTime}hs.`}
								/>

								<StepCard
									icon={<Mail className="w-4 h-4 text-white" />}
									title="Te avisaremos por email"
									description="Recibirás una notificación cuando la solicitud sea aprobada o rechazada."
								/>
							</>
						) : (
							<>
								<StepCard
									icon={<Mail className="w-4 h-4 text-white" />}
									title="Correo electrónico de confirmación enviado"
									description="Revisa tu correo para obtener el detalle de tu alquiler y recibos."
								/>

								<StepCard
									icon={<CalendarCheck className="w-4 h-4 text-white" />}
									title={`Listo para retirar el equipo el ${formattedDate}`}
									description={`Visita ${pickupLocation} a las ${pickupTime}hs`}
								/>
							</>
						)}
					</div>

					{/* Actions */}
					<div className="w-full space-y-2 pt-1">
						<Button
							className="w-full bg-neutral-900 hover:bg-neutral-700 text-white font-semibold rounded-xl h-12 text-sm tracking-wide transition-colors"
							nativeButton={false}
							render={<Link to="/rental">Volver al Catálogo</Link>}
						/>
					</div>

					{/* Thumbnail strip placeholder */}
					<ThumbnailStrip />
				</div>
			</main>

			{/* ── Footer ── */}
			<footer className="pb-8 text-xs text-neutral-400">
				Neceistas ayuda?{" "}
				<a
					href="mailto:support@luxerentals.com"
					className="underline underline-offset-2 hover:text-neutral-600 transition-colors"
				>
					Contacta con support@depiqo.com
				</a>
			</footer>
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

function ThumbnailStrip() {
	return (
		<div className="w-full grid grid-cols-3 gap-2 pt-2">
			{[1, 2, 3].map((i) => (
				<div
					key={i}
					className="aspect-3/4 rounded-xl bg-linear-to-br from-neutral-200 to-neutral-300"
				/>
			))}
		</div>
	);
}

/**
 * Formats an ISO date string (YYYY-MM-DD) into a human-readable label.
 * Falls back gracefully if the string is invalid.
 */
function formatPickupDate(dateStr: string): string {
	try {
		const date = new Date(`${dateStr}T00:00:00`);
		return date.toLocaleDateString("es-ES", { month: "long", day: "numeric" });
	} catch {
		return dateStr;
	}
}

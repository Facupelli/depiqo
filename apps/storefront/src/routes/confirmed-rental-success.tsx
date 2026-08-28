import { Button } from "@repo/ui/components/button";
import {
	ClientOnly,
	createFileRoute,
	Link,
	notFound,
} from "@tanstack/react-router";
import { CalendarCheck, CheckCircle2, Mail } from "lucide-react";
import { z } from "zod";
import { readConfirmedRentalSuccessSnapshot } from "@/modules/rental-commitment/confirmed-rentals/confirmed-rental-success-snapshot";

const confirmedRentalSuccessSearchSchema = z.object({
	rentalNumber: z.coerce.number().int().positive(),
});

export const Route = createFileRoute("/confirmed-rental-success")({
	validateSearch: confirmedRentalSuccessSearchSchema,
	beforeLoad: ({ context }) => {
		if (!context.tenantContext || context.tenantContext.face !== "storefront")
			throw notFound();
	},
	component: ConfirmedRentalSuccessPage,
});

function ConfirmedRentalSuccessPage() {
	const { rentalNumber } = Route.useSearch();

	return (
		<main className="grid min-h-svh place-items-center bg-muted/30 px-4 py-12">
			<section className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
				<div className="grid size-16 place-items-center rounded-full bg-primary text-primary-foreground">
					<CheckCircle2 className="size-8" />
				</div>
				<div className="mt-6">
					<p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
						Reserva confirmada
					</p>
					<h1 className="mt-2 text-3xl font-black tracking-tight">
						Tu equipo quedó reservado
					</h1>
					<p className="mt-3 text-sm leading-6 text-muted-foreground">
						Te enviamos la confirmación con el detalle de tu alquiler.
					</p>
					<p className="mt-3 text-xs text-muted-foreground">
						Número de reserva:{" "}
						<span className="font-medium text-foreground">{rentalNumber}</span>
					</p>
				</div>

				<div className="mt-8 space-y-3">
					<SuccessDetail
						icon={<Mail className="size-4" />}
						title="Confirmación enviada"
						description="Revisá tu correo para obtener el detalle de tu alquiler."
					/>
					<ClientOnly>
						<FulfillmentSuccessDetail rentalNumber={rentalNumber} />
					</ClientOnly>
				</div>

				<Button
					className="mt-8 w-full"
					render={<Link to="/rental">Volver al catálogo</Link>}
				/>
			</section>
		</main>
	);
}

function FulfillmentSuccessDetail({ rentalNumber }: { rentalNumber: number }) {
	const snapshot = readConfirmedRentalSuccessSnapshot(rentalNumber);
	if (!snapshot) return null;

	return (
		<SuccessDetail
			icon={<CalendarCheck className="size-4" />}
			title={
				snapshot.fulfillmentMethod === "DELIVERY"
					? "Coordinaremos la entrega"
					: `Listo para retirar el equipo el ${formatDate(snapshot.pickupDate)}`
			}
			description={
				snapshot.fulfillmentMethod === "DELIVERY"
					? "Nos pondremos en contacto para confirmar los detalles de entrega."
					: `Visitá ${snapshot.pickupLocation} a las ${snapshot.pickupTime} h.`
			}
		/>
	);
}

function SuccessDetail({
	icon,
	title,
	description,
}: {
	icon: React.ReactNode;
	title: string;
	description: string;
}) {
	return (
		<div className="flex items-start gap-3 rounded-xl bg-muted p-4">
			<div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
				{icon}
			</div>
			<div>
				<p className="text-sm font-semibold">{title}</p>
				<p className="mt-1 text-sm leading-5 text-muted-foreground">
					{description}
				</p>
			</div>
		</div>
	);
}

function formatDate(value: string): string {
	return new Intl.DateTimeFormat("es-AR", {
		day: "numeric",
		month: "long",
		timeZone: "UTC",
	}).format(new Date(`${value}T00:00:00Z`));
}

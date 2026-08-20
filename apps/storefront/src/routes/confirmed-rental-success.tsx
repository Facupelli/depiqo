import { Button } from "@repo/ui/components/button";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { CalendarCheck, CheckCircle2, Mail } from "lucide-react";
import { z } from "zod";

const confirmedRentalSuccessSearchSchema = z.object({
	rentalNumber: z.coerce.number().int().positive(),
	fulfillmentMethod: z.enum(["PICKUP", "DELIVERY"]),
	pickupDate: z.iso.date(),
	pickupLocation: z.string().trim().min(1),
	pickupTime: z.string().trim().min(1),
	deliveryAddress: z.string().trim().min(1).optional(),
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
	const {
		rentalNumber,
		fulfillmentMethod,
		pickupDate,
		pickupLocation,
		pickupTime,
		deliveryAddress,
	} = Route.useSearch();

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
					<SuccessDetail
						icon={<CalendarCheck className="size-4" />}
						title={
							fulfillmentMethod === "DELIVERY"
								? `Coordinaremos la entrega para el ${formatDate(pickupDate)}`
								: `Listo para retirar el equipo el ${formatDate(pickupDate)}`
						}
						description={
							fulfillmentMethod === "DELIVERY"
								? deliveryAddress
									? `Usaremos la dirección indicada: ${deliveryAddress}.`
									: "Nos pondremos en contacto para confirmar los detalles de entrega."
								: `Visitá ${pickupLocation} a las ${pickupTime} h.`
						}
					/>
				</div>

				<Button
					className="mt-8 w-full"
					render={<Link to="/rental">Volver al catálogo</Link>}
				/>
			</section>
		</main>
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

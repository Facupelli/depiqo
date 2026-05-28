import { AlertTriangle, Banknote, CircleHelp } from "lucide-react";

type BookingErrorMessageProps = {
	message: string;
};

export function BookingErrorMessage({ message }: BookingErrorMessageProps) {
	return (
		<div className="mt-6 flex items-start gap-3 border border-red-100 bg-red-50 px-4 py-3">
			<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
			<p className="text-xs font-semibold uppercase tracking-wider text-red-600">
				{message}
			</p>
		</div>
	);
}

type SidebarNoticesProps = {
	isAuthenticated: boolean;
};

export function SidebarNotices({ isAuthenticated }: SidebarNoticesProps) {
	return (
		<div className="mt-4 space-y-2">
			{!isAuthenticated && (
				<div className="flex items-start gap-3 bg-neutral-50 px-3 py-2.5">
					<CircleHelp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
					<p className="text-[11px] text-neutral-500">
						Puedes revisar tu pedido sin cuenta. Te pediremos iniciar sesión
						antes de completar la reserva.
					</p>
				</div>
			)}
			<div className="flex items-start gap-3 bg-neutral-50 px-3 py-2.5">
				<Banknote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
				{/* TODO: Move tenant-specific payment instructions to public tenant config. */}
				<p className="text-[11px] text-neutral-500">
					El pago se cobra al retirar los equipos.
				</p>
			</div>
		</div>
	);
}

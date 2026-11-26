import type {
	AssetUnavailabilityPeriod,
	GetEquipmentTypeAssetsItemDto,
} from "@repo/api-contracts";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { formatTimestampInTimezone } from "@/lib/dates/format";
import { useBranchTimezone } from "@/shared/timezone/operational-timezone.hooks";
import type { UnavailabilityChange } from "./temporary-unavailability.api";
import {
	isPeriodNoLongerEditable,
	unavailabilityErrorMessage,
	unavailabilityQuery,
	useChangeUnavailability,
} from "./temporary-unavailability.queries";
import {
	getPeriodStatus,
	type PeriodEditor,
	type PeriodStatus,
} from "./temporary-unavailability.schema";
import { TemporaryUnavailabilityForm } from "./temporary-unavailability-form";

type View =
	| { kind: "history" }
	| PeriodEditor
	| { kind: "cancel"; period: AssetUnavailabilityPeriod }
	| { kind: "end-now"; period: AssetUnavailabilityPeriod };

const statusLabels: Record<PeriodStatus, string> = {
	scheduled: "Programada",
	"in-progress": "En curso",
	completed: "Completada",
	cancelled: "Cancelada",
};

function formatWindowTime(value: string, timezone: string) {
	return formatTimestampInTimezone(value, timezone, "DD/MM/YYYY HH:mm Z");
}

export function TemporaryUnavailabilityDialog({
	unit,
	canManage,
	onClose,
}: {
	unit: Pick<
		GetEquipmentTypeAssetsItemDto,
		"id" | "serialNumber" | "branchId" | "branchName"
	>;
	canManage: boolean;
	onClose: () => void;
}) {
	const timezone = useBranchTimezone(unit.branchId);
	const query = useQuery(unavailabilityQuery(unit.id));
	const mutation = useChangeUnavailability(unit.id);
	const [view, setView] = useState<View>({ kind: "history" });
	const [feedback, setFeedback] = useState<{ message: string; error?: true }>();
	const [now, setNow] = useState(Date.now);
	useEffect(() => {
		const timer = window.setInterval(() => setNow(Date.now()), 1000);
		return () => window.clearInterval(timer);
	}, []);

	function goTo(next: View) {
		setFeedback(undefined);
		setView(next);
	}

	async function save(change: UnavailabilityChange) {
		setFeedback(undefined);
		try {
			await mutation.mutateAsync(change);
			setNow(Date.now());
			setView({ kind: "history" });
			setFeedback({ message: "Bloqueo actualizado." });
		} catch (error) {
			if (isPeriodNoLongerEditable(error)) {
				setNow(Date.now());
				setView({ kind: "history" });
			}
			setFeedback({ error: true, message: unavailabilityErrorMessage(error) });
		}
	}

	const activeView = canManage ? view : ({ kind: "history" } as const);
	const removing =
		activeView.kind === "cancel" || activeView.kind === "end-now";
	const title = {
		history: "Bloqueos de disponibilidad",
		schedule: "Programar bloqueo",
		reschedule: "Reprogramar bloqueo",
		"change-end": "Cambiar fin previsto",
		cancel: "Cancelar bloqueo",
		"end-now": "Finalizar ahora",
	}[activeView.kind];

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open && !mutation.isPending) onClose();
			}}
		>
			<DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>
						{unit.serialNumber ?? "Unidad sin referencia"}
						{unit.branchName && ` · ${unit.branchName}`}
						<br />
						Zona horaria: {timezone}
						{activeView.kind === "history" && (
							<span className="mt-2 block">
								{canManage
									? "Bloqueá fechas para que esta unidad no se pueda alquilar durante un mantenimiento, una reparación o una inspección."
									: "Durante un bloqueo, esta unidad no se puede alquilar. Por ejemplo, por mantenimiento, reparación o inspección."}
							</span>
						)}
					</DialogDescription>
				</DialogHeader>
				{feedback && (
					<p
						role={feedback.error ? "alert" : "status"}
						className={
							feedback.error
								? "rounded-md bg-destructive/5 p-3 text-destructive text-sm"
								: "text-muted-foreground text-sm"
						}
					>
						{feedback.message}
					</p>
				)}
				{activeView.kind === "history" ? (
					<div className="space-y-4">
						{canManage && (
							<Button onClick={() => goTo({ kind: "schedule" })}>
								<Plus /> Programar bloqueo
							</Button>
						)}
						{query.isPending && (
							<output className="block text-muted-foreground text-sm">
								Cargando bloqueos...
							</output>
						)}
						{query.isError && (
							<div
								className="flex flex-wrap items-center justify-between gap-2 text-sm"
								role="alert"
							>
								<p className="text-destructive">
									No pudimos cargar los bloqueos.
								</p>
								<Button
									variant="outline"
									size="sm"
									onClick={() => query.refetch()}
								>
									Reintentar
								</Button>
							</div>
						)}
						{query.data?.length === 0 && (
							<p className="rounded-md border border-dashed p-4 text-muted-foreground text-sm">
								Esta unidad no tiene bloqueos de disponibilidad.
							</p>
						)}
						{Boolean(query.data?.length) && (
							<ul className="divide-y rounded-md border">
								{query.data?.map((period) => {
									const status = getPeriodStatus(period, now);
									return (
										<li key={period.id} className="space-y-2 p-3">
											<div className="flex items-start justify-between gap-3">
												<p className="min-w-0 whitespace-pre-wrap break-words font-medium text-sm">
													{period.reason}
												</p>
												<Badge
													variant={
														status === "in-progress"
															? "default"
															: status === "scheduled"
																? "secondary"
																: "outline"
													}
												>
													{statusLabels[status]}
												</Badge>
											</div>
											<dl className="grid grid-cols-[auto_1fr] gap-x-2 text-muted-foreground text-xs">
												<dt>Inicio</dt>
												<dd>
													<time dateTime={period.startsAt}>
														{formatWindowTime(period.startsAt, timezone)}
													</time>
												</dd>
												<dt>Fin</dt>
												<dd>
													<time dateTime={period.endsAt}>
														{formatWindowTime(period.endsAt, timezone)}
													</time>
												</dd>
											</dl>
											{canManage &&
												!query.isError &&
												(status === "scheduled" ||
													status === "in-progress") && (
													<div className="flex flex-wrap gap-2">
														<Button
															size="sm"
															variant="outline"
															onClick={() =>
																goTo({
																	kind:
																		status === "scheduled"
																			? "reschedule"
																			: "change-end",
																	period,
																})
															}
														>
															{status === "scheduled"
																? "Reprogramar"
																: "Cambiar fin"}
														</Button>
														<Button
															size="sm"
															variant="ghost"
															onClick={() =>
																goTo({
																	kind:
																		status === "scheduled"
																			? "cancel"
																			: "end-now",
																	period,
																})
															}
														>
															{status === "scheduled"
																? "Cancelar bloqueo"
																: "Finalizar ahora"}
														</Button>
													</div>
												)}
										</li>
									);
								})}
							</ul>
						)}
					</div>
				) : removing ? (
					<div className="space-y-4">
						<p className="break-words font-medium text-sm">
							{activeView.period.reason}
						</p>
						<p className="text-muted-foreground text-sm">
							{activeView.kind === "cancel"
								? "Si el bloqueo todavía no empezó, se cancelará. Si ya empezó, terminará ahora. En ambos casos quedará registrado en el historial."
								: "El bloqueo terminará ahora. El tiempo transcurrido se conservará en el historial."}
						</p>
						<div className="flex flex-wrap justify-end gap-2 border-t pt-4">
							<Button
								variant="outline"
								disabled={mutation.isPending}
								onClick={() => goTo({ kind: "history" })}
							>
								Volver
							</Button>
							<Button
								variant="destructive"
								disabled={mutation.isPending}
								onClick={() =>
									save({ kind: "remove", periodId: activeView.period.id })
								}
							>
								{mutation.isPending
									? "Guardando..."
									: activeView.kind === "cancel"
										? "Cancelar bloqueo"
										: "Finalizar ahora"}
							</Button>
						</div>
					</div>
				) : (
					<TemporaryUnavailabilityForm
						editor={activeView}
						timezone={timezone}
						pending={mutation.isPending}
						onBack={() => goTo({ kind: "history" })}
						onSave={save}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}

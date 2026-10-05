import type { GetBackofficeCustomerSensitiveProfileResponseDto } from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getCustomerSensitiveProfile } from "./customer-sensitive-profile.api";

type SensitiveProfile = GetBackofficeCustomerSensitiveProfileResponseDto;

export function CustomerSensitiveProfile({
	customerId,
}: {
	customerId: string;
}) {
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(false);
	const [data, setData] = useState<SensitiveProfile | null>(null);
	const [showNumber, setShowNumber] = useState(false);
	const [showReferences, setShowReferences] = useState(false);
	const requestRef = useRef<AbortController | null>(null);

	useEffect(
		() => () => {
			requestRef.current?.abort();
			requestRef.current = null;
		},
		[],
	);

	function dismiss() {
		requestRef.current?.abort();
		requestRef.current = null;
		setData(null);
		setOpen(false);
		setLoading(false);
		setError(false);
		setShowNumber(false);
		setShowReferences(false);
	}

	async function load() {
		requestRef.current?.abort();
		const controller = new AbortController();
		requestRef.current = controller;
		setData(null);
		setError(false);
		setOpen(true);
		setLoading(true);
		setShowNumber(false);
		setShowReferences(false);
		try {
			const result = await getCustomerSensitiveProfile(
				customerId,
				controller.signal,
			);
			if (requestRef.current === controller && !controller.signal.aborted) {
				setData(result);
			}
		} catch {
			if (requestRef.current === controller && !controller.signal.aborted) {
				setError(true);
			}
		} finally {
			if (requestRef.current === controller && !controller.signal.aborted) {
				requestRef.current = null;
				setLoading(false);
			}
		}
	}

	const profile =
		data?.customerId === customerId ? data.submittedProfile : null;

	return (
		<Card>
			<CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
				<CardTitle className="flex items-center gap-2 text-base">
					<LockKeyhole className="size-4" /> Datos personales
				</CardTitle>
				{open ? (
					<Button type="button" variant="outline" size="sm" onClick={dismiss}>
						Ocultar
					</Button>
				) : null}
			</CardHeader>
			<CardContent className="space-y-4">
				{!open ? (
					<Button type="button" variant="outline" onClick={load}>
						Mostrar
					</Button>
				) : loading ? (
					<output className="text-sm text-muted-foreground">
						Cargando datos personales...
					</output>
				) : error ? (
					<div className="space-y-3">
						<p role="alert" className="text-sm text-destructive">
							No pudimos mostrar los datos personales.
						</p>
						<Button type="button" variant="outline" onClick={load}>
							Reintentar
						</Button>
					</div>
				) : !profile ? (
					<p className="text-sm text-muted-foreground">
						El cliente aún no envió un perfil.
					</p>
				) : (
					<>
						<dl className="grid gap-5 sm:grid-cols-2">
							<SensitiveField
								label="Fecha de nacimiento"
								value={formatLocalDate(profile.birthDate)}
							/>
							<SensitiveField
								label="Dirección residencial"
								value={profile.address}
							/>
							<SensitiveField
								label="Identificación fiscal"
								value={profile.taxId}
							/>
							<div className="space-y-1">
								<dt className="text-xs font-medium text-muted-foreground">
									Número de documento
								</dt>
								<dd className="flex flex-wrap items-center gap-2 text-sm font-medium">
									<span className="break-all">
										{showNumber
											? profile.documentNumber
											: maskDocumentNumber(profile.documentNumber)}
									</span>
									<Button
										type="button"
										size="icon-sm"
										variant="ghost"
										aria-label={
											showNumber ? "Ocultar número" : "Mostrar número"
										}
										onClick={() => setShowNumber(!showNumber)}
									>
										{showNumber ? (
											<EyeOff className="size-4" />
										) : (
											<Eye className="size-4" />
										)}
									</Button>
								</dd>
							</div>
						</dl>
						{profile.rejectionReason && (
							<dl className="border-t pt-4">
								<SensitiveField
									label="Motivo del rechazo"
									value={profile.rejectionReason}
								/>
							</dl>
						)}
						<div className="space-y-3 border-t pt-4">
							<p className="text-sm font-medium">Contactos de referencia</p>
							<Button
								type="button"
								size="sm"
								variant="outline"
								onClick={() => setShowReferences(!showReferences)}
							>
								{showReferences
									? "Ocultar contactos"
									: "Mostrar contactos de referencia"}
							</Button>
							{showReferences && (
								<dl className="grid gap-4 sm:grid-cols-2">
									{(["1", "2"] as const).map((position, index) => (
										<div
											key={position}
											className="min-w-0 space-y-2 rounded-md border p-3"
										>
											<dt className="text-xs font-medium text-muted-foreground">
												Referencia {position}
											</dt>
											<dd className="text-sm break-words">
												{[
													profile.referenceContacts[index].name,
													profile.referenceContacts[index].phone,
													profile.referenceContacts[index].relationship,
												]
													.filter(Boolean)
													.join(" · ") || "No disponible"}
											</dd>
										</div>
									))}
								</dl>
							)}
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
}

function SensitiveField({
	label,
	value,
}: {
	label: string;
	value: string | null;
}) {
	return (
		<div className="min-w-0 space-y-1">
			<dt className="text-xs font-medium text-muted-foreground">{label}</dt>
			<dd className="text-sm font-medium break-words">
				{value || "No disponible"}
			</dd>
		</div>
	);
}

function formatLocalDate(value: string) {
	const [year, month, day] = value.split("-");
	return `${day}/${month}/${year}`;
}

function maskDocumentNumber(value: string) {
	return value.length > 4
		? `${"•".repeat(value.length - 4)}${value.slice(-4)}`
		: "•".repeat(value.length);
}

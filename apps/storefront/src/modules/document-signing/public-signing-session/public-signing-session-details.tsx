import type { GetPublicSigningSessionResponseDto } from "@repo/api-contracts";
import { useId } from "react";

type PublicSigningSessionDetailsProps = {
	session: GetPublicSigningSessionResponseDto;
};

export function PublicSigningSessionDetails({
	session,
}: PublicSigningSessionDetailsProps) {
	const documentHeadingId = useId();

	return (
		<section aria-labelledby={documentHeadingId} className="space-y-4">
			<div>
				<p className="text-sm font-medium text-neutral-500">
					Documento para firma
				</p>
				<h1
					id={documentHeadingId}
					className="text-2xl font-semibold tracking-tight"
				>
					{session.document.displayFileName}
				</h1>
			</div>
			<dl className="grid gap-3 text-sm sm:grid-cols-2">
				<Detail label="Firmante" value={session.signer.name} />
				<Detail label="Correo" value={session.signer.email ?? "No informado"} />
				<Detail
					label="Documento"
					value={session.document.documentNumber ?? "Sin número"}
				/>
				<Detail
					label="Vigencia"
					value={
						session.expiresAt
							? formatDateTime(session.expiresAt)
							: "Sin vencimiento"
					}
				/>
			</dl>
		</section>
	);
}

function Detail({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-lg border border-neutral-200 p-3">
			<dt className="text-neutral-500">{label}</dt>
			<dd className="mt-1 font-medium text-neutral-900">{value}</dd>
		</div>
	);
}

function formatDateTime(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;

	return new Intl.DateTimeFormat("es-AR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
}

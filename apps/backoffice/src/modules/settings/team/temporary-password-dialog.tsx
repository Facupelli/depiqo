import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

export type TemporaryPasswordResult = {
	email: string;
	password: string;
	reason: "created" | "reset";
};

export function TemporaryPasswordDialog({
	result,
	onClose,
}: {
	result: TemporaryPasswordResult | null;
	onClose: () => void;
}) {
	const [copied, setCopied] = useState(false);

	async function copyPassword() {
		await navigator.clipboard.writeText(result?.password ?? "");
		setCopied(true);
	}

	return (
		<Dialog open={result !== null} onOpenChange={(open) => !open && onClose()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Contraseña temporal</DialogTitle>
					<DialogDescription>
						{result?.reason === "created"
							? "El integrante fue creado correctamente."
							: "La contraseña fue restablecida y las sesiones anteriores quedaron invalidadas."}
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-3">
					<p className="text-sm text-muted-foreground">
						Comparte esta credencial de forma segura con {result?.email}. Solo
						se muestra una vez y deberá cambiarla al iniciar sesión.
					</p>
					<div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3">
						<code className="min-w-0 flex-1 break-all font-mono text-base font-semibold">
							{result?.password}
						</code>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={copyPassword}
						>
							{copied ? <Check /> : <Copy />}
							{copied ? "Copiada" : "Copiar"}
						</Button>
					</div>
					<p className="text-sm font-medium text-amber-700">
						Guárdala ahora. No podrás volver a verla después de cerrar esta
						ventana.
					</p>
				</div>
				<DialogFooter>
					<Button type="button" onClick={onClose}>
						Entendido
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

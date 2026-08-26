import { MessageCircle, X } from "lucide-react";
import { useState } from "react";
import { usePublicTenantConfig } from "@/modules/tenant-management/tenant/tenant.queries";

export function FloatingWhatsAppButton() {
	const { data: config } = usePublicTenantConfig();
	const [isCalloutVisible, setIsCalloutVisible] = useState(true);

	if (!config.showFloatingWhatsAppButton || !config.whatsAppNumber) {
		return null;
	}

	return (
		<div className="fixed right-4 bottom-6 z-50 flex items-center gap-3 md:right-6 md:bottom-8">
			{isCalloutVisible && (
				<div className="relative hidden rounded-lg bg-white py-3 pr-9 pl-4 text-right shadow-lg ring-1 ring-black/5 md:block">
					<button
						type="button"
						onClick={() => setIsCalloutVisible(false)}
						aria-label="Cerrar mensaje de WhatsApp"
						className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<X className="size-4" aria-hidden="true" />
					</button>
					<p className="text-sm font-semibold text-foreground">
						¿No encontrás tu combo?
					</p>
					<p className="text-sm text-muted-foreground">
						Escribinos y te lo armamos
					</p>
				</div>
			)}
			<a
				href={`https://wa.me/${config.whatsAppNumber}`}
				target="_blank"
				rel="noopener noreferrer"
				aria-label="Contactanos por WhatsApp"
				className="group flex size-14 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 focus-visible:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2"
			>
				<MessageCircle className="size-7" aria-hidden="true" />
			</a>
		</div>
	);
}

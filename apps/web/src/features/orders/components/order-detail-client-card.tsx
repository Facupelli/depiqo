import { Link } from "@tanstack/react-router";
import { ExternalLink, Mail, User2Icon } from "lucide-react";
import {
	getCustomerContactName,
	getCustomerDisplayName,
	getCustomerInitials,
} from "@/features/customer/customer.utils";
import {
	SidebarCardHeader,
	SidebarField,
} from "@/features/orders/components/order-detail-sidebar-primitives";
import { useOrderDetailContext } from "@/features/orders/contexts/order-detail.context";

export function OrderClientCard() {
	const { order } = useOrderDetailContext();
	const customer = order.customer;
	const displayName = customer ? getCustomerDisplayName(customer) : null;
	const contactName = customer ? getCustomerContactName(customer) : null;
	const initials = customer ? getCustomerInitials(customer) : null;

	return (
		<section className="bg-white border border-neutral-200 rounded-lg p-5">
			<SidebarCardHeader
				icon={<User2Icon className="size-4" />}
				title="Información del cliente"
				action={
					customer ? (
						<Link
							to="/dashboard/customers/$customerId"
							params={{ customerId: customer.id }}
							className="flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-950 transition-colors"
						>
							Ver Perfil
							<ExternalLink className="w-3 h-3" />
						</Link>
					) : null
				}
			/>

			{customer ? (
				<>
					{/* Avatar + name */}
					<div className="flex items-center gap-3 mb-4">
						<div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center shrink-0">
							<span className="text-sm font-bold text-neutral-600">
								{initials}
							</span>
						</div>
						<div>
							<p className="text-sm font-bold text-neutral-950 leading-tight">
								{displayName}
							</p>
							{contactName && (
								<p className="text-xs text-neutral-400 mt-0.5">{contactName}</p>
							)}
						</div>
					</div>

					{/* Contact fields */}
					<div className="space-y-2.5">
						<SidebarField
							icon={<Mail className="w-3.5 h-3.5" />}
							value={customer.email}
						/>
					</div>
				</>
			) : (
				<div className="rounded-md border border-amber-200 bg-amber-50/60 px-3 py-3">
					<p className="text-sm font-medium text-amber-900">
						Todavia no hay un cliente vinculado.
					</p>
					<p className="mt-1 text-xs text-amber-800/85">
						La confirmacion del borrador esta bloqueada hasta asociar un
						cliente.
					</p>
				</div>
			)}
		</section>
	);
}

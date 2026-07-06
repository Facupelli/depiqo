import type { GetRentalCustomersItemDto } from "@repo/api-contracts";
import { Check, Search, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import useDebounce from "@/shared/hooks/use-debounce";
import { useRentalCustomers } from "../rental-customer.queries";

type RentalCustomerSelectorProps = {
	value: string;
	onValueChange: (customerId: string) => void;
	placeholder?: string;
	allowEmpty?: boolean;
};

export function RentalCustomerSelector({
	value,
	onValueChange,
	placeholder = "Sin cliente asignado",
	allowEmpty = true,
}: RentalCustomerSelectorProps) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const debouncedSearch = useDebounce(search, 250).trim();
	const { data, isFetching } = useRentalCustomers({
		search: debouncedSearch || undefined,
		page: 1,
		pageSize: 8,
	});
	const customers = data?.data ?? [];
	const selectedCustomer = customers.find((customer) => customer.id === value);
	const selectedLabel = selectedCustomer
		? customerLabel(selectedCustomer)
		: value
			? "Cliente seleccionado"
			: placeholder;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger render={<Button type="button" variant="outline" />}>
				<span className="min-w-0 flex-1 truncate text-left">
					{selectedLabel}
				</span>
				{value && allowEmpty ? (
					<X
						className="size-4 text-muted-foreground"
						onClick={(event) => {
							event.stopPropagation();
							onValueChange("");
						}}
					/>
				) : null}
			</PopoverTrigger>
			<PopoverContent className="w-[320px] p-2" align="start">
				<div className="relative">
					<Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
					<Input
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder="Buscar cliente"
						className="pl-9"
					/>
				</div>
				<div className="max-h-64 space-y-1 overflow-auto">
					{allowEmpty ? (
						<button
							type="button"
							onClick={() => {
								onValueChange("");
								setOpen(false);
							}}
							className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-muted"
						>
							Sin cliente asignado
							{!value ? <Check className="size-4" /> : null}
						</button>
					) : null}
					{customers.map((customer) => (
						<button
							type="button"
							key={customer.id}
							onClick={() => {
								onValueChange(customer.id);
								setOpen(false);
							}}
							className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
						>
							<span className="min-w-0">
								<span className="block truncate font-medium">
									{customerName(customer)}
								</span>
								<span className="block truncate text-muted-foreground text-xs">
									{customer.email}
								</span>
							</span>
							{value === customer.id ? <Check className="size-4" /> : null}
						</button>
					))}
					{customers.length === 0 ? (
						<p className="px-2 py-6 text-center text-muted-foreground text-sm">
							{isFetching ? "Buscando clientes..." : "No encontramos clientes"}
						</p>
					) : null}
				</div>
			</PopoverContent>
		</Popover>
	);
}

type Customer = GetRentalCustomersItemDto;

function customerName(customer: Customer) {
	return `${customer.firstName} ${customer.lastName}`.trim();
}

function customerLabel(customer: Customer) {
	return customer.email
		? `${customerName(customer)} · ${customer.email}`
		: customerName(customer);
}

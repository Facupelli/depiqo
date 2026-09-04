import type { BranchAddressSuggestionDto } from "@repo/api-contracts";
import { Input } from "@repo/ui/components/input";
import { Popover, PopoverContent } from "@repo/ui/components/popover";
import { Loader2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import useDebounce from "@/shared/hooks/use-debounce";

import { useBranchAddressSuggestions } from "./branches.queries";

type AddressAutocompleteProps = {
	id: string;
	name: string;
	value: string;
	isInvalid: boolean;
	onBlur: () => void;
	onChange: (value: string) => void;
	onSelect: (suggestion: BranchAddressSuggestionDto) => void;
};

export function AddressAutocomplete({
	id,
	name,
	value,
	isInvalid,
	onBlur,
	onChange,
	onSelect,
}: AddressAutocompleteProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const listboxId = useId();

	const [open, setOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(-1);

	const debouncedValue = useDebounce(value, 300);

	const canSearch = value.trim().length >= 3;
	const debouncedCanSearch = debouncedValue.trim().length >= 3;

	const query = useBranchAddressSuggestions(
		debouncedCanSearch ? debouncedValue : "",
	);

	const suggestions = query.data?.suggestions ?? [];

	const isWaitingForDebounce = canSearch && debouncedValue !== value;

	const showPopover = open && canSearch;

	useEffect(() => {
		if (activeIndex >= suggestions.length) {
			setActiveIndex(-1);
		}
	}, [activeIndex, suggestions.length]);

	function closePopover() {
		setOpen(false);
		setActiveIndex(-1);
	}

	function selectSuggestion(suggestion: BranchAddressSuggestionDto) {
		onSelect(suggestion);
		closePopover();
	}

	return (
		<Popover
			open={showPopover}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);

				if (!nextOpen) {
					setActiveIndex(-1);
				}
			}}
		>
			<Input
				ref={inputRef}
				id={id}
				name={name}
				value={value}
				onFocus={() => {
					if (canSearch) {
						setOpen(true);
					}
				}}
				onBlur={onBlur}
				onChange={(event) => {
					const nextValue = event.target.value;

					onChange(nextValue);
					setOpen(nextValue.trim().length >= 3);
					setActiveIndex(-1);
				}}
				onKeyDown={(event) => {
					if (event.key === "Escape") {
						closePopover();
						return;
					}

					if (!showPopover || suggestions.length === 0) {
						return;
					}

					if (event.key === "ArrowDown") {
						event.preventDefault();

						setActiveIndex((current) =>
							current >= suggestions.length - 1 ? 0 : current + 1,
						);

						return;
					}

					if (event.key === "ArrowUp") {
						event.preventDefault();

						setActiveIndex((current) =>
							current <= 0 ? suggestions.length - 1 : current - 1,
						);

						return;
					}

					if (event.key === "Enter" && activeIndex >= 0) {
						event.preventDefault();

						const suggestion = suggestions[activeIndex];

						if (suggestion) {
							selectSuggestion(suggestion);
						}
					}
				}}
				role="combobox"
				aria-autocomplete="list"
				aria-controls={showPopover ? listboxId : undefined}
				aria-expanded={showPopover}
				aria-activedescendant={
					activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined
				}
				aria-invalid={isInvalid}
				placeholder="Ej. Av. Corrientes 1234"
			/>

			<PopoverContent
				anchor={inputRef}
				align="start"
				side="bottom"
				sideOffset={4}
				initialFocus={false}
				finalFocus={false}
				id={listboxId}
				role="listbox"
				className="max-h-64 overflow-y-auto p-1.5"
				style={{
					width: "var(--anchor-width)",
				}}
			>
				{isWaitingForDebounce || query.isFetching ? (
					<p className="flex items-center gap-2 px-2 py-2 text-muted-foreground">
						<Loader2 className="size-3.5 animate-spin" />
						Buscando direcciones...
					</p>
				) : query.isError ? (
					<p className="px-2 py-2 text-destructive">
						No pudimos buscar direcciones. Intentá nuevamente.
					</p>
				) : suggestions.length === 0 ? (
					<p className="px-2 py-2 text-muted-foreground">
						No encontramos direcciones.
					</p>
				) : (
					suggestions.map((suggestion, index) => (
						<button
							id={`${listboxId}-${index}`}
							key={suggestion.locationId}
							type="button"
							role="option"
							aria-selected={activeIndex === index}
							onMouseDown={(event) => {
								event.preventDefault();
							}}
							onMouseEnter={() => {
								setActiveIndex(index);
							}}
							onClick={() => {
								selectSuggestion(suggestion);
							}}
							className="block w-full rounded-md px-2 py-2 text-left hover:bg-muted aria-selected:bg-muted"
						>
							<SuggestionLabel suggestion={suggestion} />
						</button>
					))
				)}
			</PopoverContent>
		</Popover>
	);
}

function SuggestionLabel({
	suggestion,
}: {
	suggestion: BranchAddressSuggestionDto;
}) {
	if (!suggestion.addressLine1 && !suggestion.addressLine2) {
		return <span>{suggestion.formattedAddress}</span>;
	}

	return (
		<>
			{suggestion.addressLine1 && (
				<span className="block font-medium">{suggestion.addressLine1}</span>
			)}

			{suggestion.addressLine2 && (
				<span className="block text-muted-foreground text-xs">
					{suggestion.addressLine2}
				</span>
			)}
		</>
	);
}

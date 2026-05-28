import { OnboardingStatus } from "@repo/types";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ONBOARDING_STATUS_LABELS } from "./customers-columns";
import type { useCustomersFilters } from "./use-customers-filters";

// ---------------------------------------------------------------------------
// The toolbar receives the filter state + setters from the parent.
// Keeping it prop-driven (rather than calling the hook internally) makes it
// easier to test in isolation and avoids prop-drilling the entire hook.
// ---------------------------------------------------------------------------

type ToolbarProps = Pick<
	ReturnType<typeof useCustomersFilters>,
	| "filters"
	| "hasActiveFilters"
	| "setSearch"
	| "setOnboardingStatus"
	| "setIsActive"
	| "setIsCompany"
	| "resetFilters"
>;

// Sentinel value for "no filter selected" in <Select>.
// shadcn's Select doesn't play well with null/undefined as values,
// so we use an explicit string and convert back to null on change.
const ALL_VALUE = "__ALL__";

export function CustomersToolbar({
	filters,
	hasActiveFilters,
	setSearch,
	setOnboardingStatus,
	setIsActive,
	setIsCompany,
	resetFilters,
}: ToolbarProps) {
	return (
		<div className="flex flex-wrap items-center gap-2 py-4">
			{/* Search */}
			<Input
				placeholder="Search by name, email…"
				value={filters.search}
				onChange={(e) => setSearch(e.target.value)}
				className="h-8 w-64"
			/>

			{/* Onboarding status filter */}
			<Select
				value={filters.onboardingStatus ?? ALL_VALUE}
				onValueChange={(val) =>
					setOnboardingStatus(
						val === ALL_VALUE ? null : (val as OnboardingStatus),
					)
				}
			>
				<SelectTrigger className="h-8 w-44">
					<SelectValue placeholder="Onboarding status" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={ALL_VALUE}>All statuses</SelectItem>
					{Object.values(OnboardingStatus).map((status) => (
						<SelectItem key={status} value={status}>
							{ONBOARDING_STATUS_LABELS[status]}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{/* Active / Inactive filter */}
			<Select
				value={filters.isActive === null ? ALL_VALUE : String(filters.isActive)}
				onValueChange={(val) =>
					setIsActive(val === ALL_VALUE ? null : val === "true")
				}
			>
				<SelectTrigger className="h-8 w-36">
					<SelectValue placeholder="Active?" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={ALL_VALUE}>All</SelectItem>
					<SelectItem value="true">Active</SelectItem>
					<SelectItem value="false">Inactive</SelectItem>
				</SelectContent>
			</Select>

			{/* Individual / Company filter */}
			<Select
				value={
					filters.isCompany === null ? ALL_VALUE : String(filters.isCompany)
				}
				onValueChange={(val) =>
					setIsCompany(val === ALL_VALUE ? null : val === "true")
				}
			>
				<SelectTrigger className="h-8 w-36">
					<SelectValue placeholder="Type" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={ALL_VALUE}>All types</SelectItem>
					<SelectItem value="false">Individual</SelectItem>
					<SelectItem value="true">Company</SelectItem>
				</SelectContent>
			</Select>

			{/* Reset — only shown when something is filtered */}
			{hasActiveFilters && (
				<Button
					variant="ghost"
					size="sm"
					onClick={resetFilters}
					className="h-8 px-2 text-muted-foreground"
				>
					<X className="mr-1 h-3.5 w-3.5" />
					Reset
				</Button>
			)}
		</div>
	);
}

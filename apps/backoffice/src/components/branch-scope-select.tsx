import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import type { BranchScopeFilter } from "@/application/branch-scope/branch-scope-filter";

const ALL_BRANCHES_VALUE = "__ALL_BRANCHES__";

type BranchScopeSelectProps = {
	value: BranchScopeFilter;
	branches: Array<{ id: string; name: string }>;
	inheritedBranchId: string | null;
	onChange: (value: BranchScopeFilter) => void;
	className?: string;
};

export function BranchScopeSelect({
	value,
	branches,
	inheritedBranchId,
	onChange,
	className,
}: BranchScopeSelectProps) {
	const selectItems = [
		{ label: "Todas", value: ALL_BRANCHES_VALUE },
		...branches.map((branch) => ({ label: branch.name, value: branch.id })),
	];
	const selectValue =
		value.type === "branch"
			? value.branchId
			: value.type === "all"
				? ALL_BRANCHES_VALUE
				: (inheritedBranchId ?? ALL_BRANCHES_VALUE);

	return (
		<Select
			value={selectValue}
			items={selectItems}
			onValueChange={(nextValue) => {
				if (!nextValue) return;

				if (nextValue === ALL_BRANCHES_VALUE) {
					onChange(
						inheritedBranchId === null ? { type: "inherit" } : { type: "all" },
					);
				} else {
					onChange(
						nextValue === inheritedBranchId
							? { type: "inherit" }
							: { type: "branch", branchId: nextValue },
					);
				}
			}}
		>
			<SelectTrigger className={className}>
				<span className="mr-1 text-muted-foreground text-xs">Sucursal</span>
				<SelectValue placeholder="Sucursal" />
			</SelectTrigger>
			<SelectContent>
				{selectItems.map((option) => (
					<SelectItem key={option.value} value={option.value}>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

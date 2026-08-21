import type { ReactNode } from "react";
import type { SettingsRowAlign } from "@/modules/settings/business-configuration/settings-form";

export function ReadOnlyRow({
	label,
	value,
	action,
	align = "end",
}: {
	label: string;
	value: string;
	action?: ReactNode;
	align?: SettingsRowAlign;
}) {
	return (
		<div
			className={
				align === "start"
					? "grid gap-1 px-5 py-4 sm:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] sm:items-center sm:gap-8"
					: "flex items-center justify-between gap-8 px-5 py-4"
			}
		>
			<p className="text-sm font-semibold">{label}</p>
			<div className="flex items-center gap-3">
				<p className="text-sm text-muted-foreground">{value}</p>
				{action}
			</div>
		</div>
	);
}

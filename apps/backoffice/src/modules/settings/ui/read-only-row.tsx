export function ReadOnlyRow({
	label,
	value,
}: {
	label: string;
	value: string;
}) {
	return (
		<div className="flex items-center justify-between gap-8 px-5 py-4">
			<p className="text-sm font-semibold">{label}</p>
			<p className="text-sm text-muted-foreground">{value}</p>
		</div>
	);
}

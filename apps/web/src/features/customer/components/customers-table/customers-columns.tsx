import { Badge } from "@/components/ui/badge";
import type { CustomerResponseDto } from "@repo/schemas";
import { OnboardingStatus } from "@repo/types";
import type { ColumnDef } from "@tanstack/react-table";

export const ONBOARDING_STATUS_LABELS: Record<OnboardingStatus, string> = {
	[OnboardingStatus.NOT_STARTED]: "No iniciado",
	[OnboardingStatus.PENDING]: "Pendiente",
	[OnboardingStatus.APPROVED]: "Aprovado",
	[OnboardingStatus.REJECTED]: "Rechazado",
};

// Maps each status to a shadcn Badge variant
type BadgeVariant = "secondary" | "outline" | "default" | "destructive";

const ONBOARDING_STATUS_VARIANT: Record<OnboardingStatus, BadgeVariant> = {
	[OnboardingStatus.NOT_STARTED]: "outline",
	[OnboardingStatus.PENDING]: "secondary",
	[OnboardingStatus.APPROVED]: "default", // green in most shadcn themes
	[OnboardingStatus.REJECTED]: "destructive",
};

export const customersColumns: ColumnDef<CustomerResponseDto>[] = [
	{
		// Combine first + last into one "Name" column.
		// Using accessorFn gives us a sortable string while keeping rendering flexible.
		id: "name",
		header: "Nombre",
		accessorFn: (row) => `${row.firstName} ${row.lastName}`,
		cell: ({ row }) => {
			const { firstName, lastName, isCompany, companyName } = row.original;
			return (
				<div className="flex flex-col gap-0.5">
					<span className="font-medium leading-snug">
						{firstName} {lastName}
					</span>
					{isCompany && companyName && (
						<span className="text-xs text-muted-foreground">{companyName}</span>
					)}
				</div>
			);
		},
	},
	{
		accessorKey: "email",
		header: "Email",
		cell: ({ getValue }) => (
			<span className="text-sm text-muted-foreground">
				{getValue<string>()}
			</span>
		),
	},
	{
		accessorKey: "isCompany",
		header: "Tipo",
		cell: ({ getValue }) => {
			const isCompany = getValue<boolean>();
			return (
				<Badge variant="outline" className="capitalize">
					{isCompany ? "Company" : "Individual"}
				</Badge>
			);
		},
	},
	{
		accessorKey: "isActive",
		header: "Estado",
		cell: ({ getValue }) => {
			const isActive = getValue<boolean>();
			return (
				<Badge variant={isActive ? "default" : "secondary"}>
					{isActive ? "Activo" : "Inactivo"}
				</Badge>
			);
		},
	},
	{
		accessorKey: "onboardingStatus",
		header: "Onboarding",
		cell: ({ getValue }) => {
			const status = getValue<OnboardingStatus>();
			return (
				<Badge variant={ONBOARDING_STATUS_VARIANT[status]}>
					{ONBOARDING_STATUS_LABELS[status]}
				</Badge>
			);
		},
	},
	{
		accessorKey: "createdAt",
		header: "Creado",
		cell: ({ getValue }) => {
			const date = getValue<Date>();
			return (
				<span className="text-sm text-muted-foreground tabular-nums">
					{new Intl.DateTimeFormat("en-GB", {
						day: "2-digit",
						month: "short",
						year: "numeric",
					}).format(new Date(date))}
				</span>
			);
		},
	},
];

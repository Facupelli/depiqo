import { OnboardingStatus } from "@repo/types";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCustomerDetail } from "../../customer.queries";

interface OverviewTabProps {
	customerId: string;
}

export function OverviewTab({ customerId }: OverviewTabProps) {
	return (
		<div className="grid grid-cols-3 gap-4">
			<div className="col-span-2 flex flex-col gap-4">
				<CustomerInfoCard customerId={customerId} />
				<ActiveRentalsCard customerId={customerId} />
			</div>
			<div className="col-span-1 flex flex-col gap-4">
				<StatsCards customerId={customerId} />
			</div>
		</div>
	);
}

interface CustomerInfoCardProps {
	customerId: string;
}

export function CustomerInfoCard({ customerId }: CustomerInfoCardProps) {
	const { data: customer } = useCustomerDetail(customerId);

	const fullName = `${customer.firstName} ${customer.lastName}`;
	const initials =
		`${customer.firstName[0]}${customer.lastName[0]}`.toUpperCase();
	const accountType = customer.isCompany ? "Company" : "Individual";

	return (
		<Card className="bg-card border-border">
			<CardContent>
				{/* Top row: avatar + name + actions */}
				<div className="flex items-center justify-between mb-6">
					<div className="flex items-center gap-4">
						<Avatar className="size-14 bg-muted">
							<AvatarFallback className="bg-muted text-muted-foreground font-medium">
								{initials}
							</AvatarFallback>
						</Avatar>
						<div>
							<p className="text-base font-semibold text-foreground">
								{fullName}
							</p>
							<p className="text-sm text-muted-foreground">{customer.email}</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<Button variant="outline" size="sm">
							Edit Account
						</Button>
						<Button variant="outline" size="sm">
							Send Email
						</Button>
					</div>
				</div>

				{/* Bottom row: metadata */}
				<div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
					<div>
						<p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
							Account Type
						</p>
						<p className="text-sm font-medium text-foreground">{accountType}</p>
					</div>
					<div>
						<p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
							Created
						</p>
						<p className="text-sm font-medium text-foreground">
							{format(new Date(customer.createdAt), "MMM d, yyyy")}
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

interface StatsCardsProps {
	customerId: string;
}

const ONBOARDING_PROGRESS: Record<OnboardingStatus, number> = {
	[OnboardingStatus.NOT_STARTED]: 0,
	[OnboardingStatus.PENDING]: 50,
	[OnboardingStatus.APPROVED]: 100,
	[OnboardingStatus.REJECTED]: 100,
};

const ONBOARDING_LABEL: Record<OnboardingStatus, string> = {
	[OnboardingStatus.NOT_STARTED]: "Not Started",
	[OnboardingStatus.PENDING]: "In Progress",
	[OnboardingStatus.APPROVED]: "Approved",
	[OnboardingStatus.REJECTED]: "Rejected",
};

export function StatsCards({ customerId }: StatsCardsProps) {
	const { data: customer } = useCustomerDetail(customerId);

	const onboardingStatus = customer.onboardingStatus as OnboardingStatus;
	const progress = ONBOARDING_PROGRESS[onboardingStatus];
	const onboardingLabel = ONBOARDING_LABEL[onboardingStatus];

	return (
		<div className="grid grid-cols-1 gap-4">
			{/* Total Orders */}
			<Card className="bg-card border-border">
				<CardContent>
					<p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
						Total Orders
					</p>
					<p className="text-3xl font-bold text-foreground">
						{customer.totalOrders}
					</p>
				</CardContent>
			</Card>

			{/* Onboarding */}
			<Card className="bg-card border-border">
				<CardContent>
					<p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
						Onboarding
					</p>
					<p className="text-lg font-semibold text-emerald-400 mb-3">
						{progress}% {onboardingLabel}
					</p>
					<div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
						<div
							className="h-full bg-emerald-500 rounded-full transition-all duration-300"
							style={{ width: `${progress}%` }}
						/>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

interface ActiveRentalsCardProps {
	customerId: string;
}

export function ActiveRentalsCard({ customerId }: ActiveRentalsCardProps) {
	const { data: customer } = useCustomerDetail(customerId);

	const rentals = customer.activeRentals;

	return (
		<Card className="bg-card border-border">
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						Active Rentals
					</CardTitle>
					<div className="flex items-center gap-1">
						<Button variant="ghost" size="icon" className="h-7 w-7">
							<ChevronLeft className="h-4 w-4" />
						</Button>
						<Button variant="ghost" size="icon" className="h-7 w-7">
							<ChevronRight className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</CardHeader>

			<CardContent>
				{rentals.length === 0 ? (
					<p className="text-sm text-muted-foreground">No active rentals.</p>
				) : (
					<table className="w-full">
						<thead>
							<tr className="border-b border-border">
								<th className="text-left text-xs text-muted-foreground uppercase tracking-wide pb-3">
									Order #
								</th>
								<th className="text-left text-xs text-muted-foreground uppercase tracking-wide pb-3">
									Return Date
								</th>
								<th className="text-left text-xs text-muted-foreground uppercase tracking-wide pb-3">
									Status
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{rentals.map((rental) => (
								<tr key={rental.orderId}>
									<td className="py-3 text-sm font-medium text-foreground">
										#{rental.orderNumber}
									</td>
									<td className="py-3 text-sm text-foreground">
										{format(new Date(rental.returnDate), "MMM d, yyyy")}
									</td>
									<td className="py-3">
										<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-foreground uppercase tracking-wide">
											On Rental
										</span>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</CardContent>
		</Card>
	);
}

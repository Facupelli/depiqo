import type { CustomerProfileResponseDto } from "@repo/schemas";
import { format, formatDistanceToNow } from "date-fns";
import { ClipboardCheck } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useCustomerProfile } from "../../customer.queries";
import {
	getInstagramProfileUrl,
	getLeadSourceLabel,
	getSafeValue,
} from "../review/customer-profile-review.utils";

interface ProfileTabProps {
	customerId: string;
}

export function ProfileTab({ customerId }: ProfileTabProps) {
	const { data: profile, isLoading } = useCustomerProfile(customerId);

	if (isLoading) {
		return <ProfileTabSkeleton />;
	}

	if (!profile) {
		return (
			<p className="text-sm text-muted-foreground">No profile submitted yet.</p>
		);
	}

	return (
		<div className="grid grid-cols-3 gap-4">
			<div className="col-span-2 flex flex-col gap-4">
				<PersonalInfoCard profile={profile} />
				<AddressCard profile={profile} />
				<div className="grid grid-cols-2 gap-4">
					<ProfessionalCard profile={profile} />
					<BankDetailsCard profile={profile} />
				</div>
				<div className="grid grid-cols-2 gap-4">
					<AcquisitionCard profile={profile} />
					<ReferenceContactsCard profile={profile} />
				</div>
			</div>
			<div className="col-span-1">
				<ProfileReviewPanel profile={profile} />
			</div>
		</div>
	);
}

function ProfileTabSkeleton() {
	return (
		<div className="grid grid-cols-3 gap-4">
			<div className="col-span-2 flex flex-col gap-4">
				<Skeleton className="h-48 w-full rounded-lg" />
				<Skeleton className="h-56 w-full rounded-lg" />
				<div className="grid grid-cols-2 gap-4">
					<Skeleton className="h-40 w-full rounded-lg" />
					<Skeleton className="h-40 w-full rounded-lg" />
				</div>
			</div>
			<div className="col-span-1">
				<Skeleton className="h-80 w-full rounded-lg" />
			</div>
		</div>
	);
}

interface PersonalInfoCardProps {
	profile: CustomerProfileResponseDto;
}

export function PersonalInfoCard({ profile }: PersonalInfoCardProps) {
	return (
		<Card className="bg-card border-border">
			<CardHeader className="px-6 pt-5 pb-4 border-b border-border">
				<CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					Personal Information
				</CardTitle>
			</CardHeader>
			<CardContent className="px-6 py-5">
				<div className="grid grid-cols-2 gap-x-8 gap-y-5">
					<ProfileField label="Full Name" value={profile.fullName} />
					<ProfileField label="Phone" value={profile.phone} />
					<ProfileField
						label="Birth Date"
						value={format(new Date(profile.birthDate), "MMM d, yyyy")}
					/>
					<ProfileField label="ID Number" value={profile.documentNumber} />
				</div>
			</CardContent>
		</Card>
	);
}

interface AddressCardProps {
	profile: CustomerProfileResponseDto;
}

export function AddressCard({ profile }: AddressCardProps) {
	return (
		<Card className="bg-card border-border">
			<CardHeader className="px-6 pt-5 pb-4 border-b border-border">
				<CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					Address Details
				</CardTitle>
			</CardHeader>
			<CardContent className="px-6 py-5">
				<div className="grid grid-cols-2 gap-x-8 gap-y-5">
					<div className="col-span-2">
						<ProfileField label="Street" value={profile.address} />
					</div>
					<ProfileField label="City" value={profile.city} />
					<ProfileField label="Region / State" value={profile.stateRegion} />
					<ProfileField label="Country" value={profile.country} />
				</div>
			</CardContent>
		</Card>
	);
}

interface ProfessionalCardProps {
	profile: CustomerProfileResponseDto;
}

export function ProfessionalCard({ profile }: ProfessionalCardProps) {
	return (
		<Card className="bg-card border-border">
			<CardHeader className="px-6 pt-5 pb-4 border-b border-border">
				<CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					Professional
				</CardTitle>
			</CardHeader>
			<CardContent className="px-6 py-5 flex flex-col gap-5">
				<ProfileField label="Occupation" value={profile.occupation} />
				<ProfileField label="Company" value={profile.company ?? "—"} />
				<ProfileField label="Tax ID" value={profile.taxId ?? "—"} />
				<ProfileField
					label="Business Name"
					value={profile.businessName ?? "—"}
				/>
			</CardContent>
		</Card>
	);
}

interface BankDetailsCardProps {
	profile: CustomerProfileResponseDto;
}

function maskAccountNumber(accountNumber: string): string {
	if (accountNumber.length <= 4) return accountNumber;
	const visible = accountNumber.slice(-4);
	const masked = "*".repeat(accountNumber.length - 4).replace(/(.{4})/g, "$1 ");
	return `${masked}${visible}`;
}

export function BankDetailsCard({ profile }: BankDetailsCardProps) {
	return (
		<Card className="bg-card border-border">
			<CardHeader className="px-6 pt-5 pb-4 border-b border-border">
				<CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					Bank Details
				</CardTitle>
			</CardHeader>
			<CardContent className="px-6 py-5 flex flex-col gap-5">
				<ProfileField label="Bank Name" value={profile.bankName} />
				<ProfileField
					label="Account Number"
					value={maskAccountNumber(profile.accountNumber)}
				/>
			</CardContent>
		</Card>
	);
}

function AcquisitionCard({ profile }: BankDetailsCardProps) {
	const instagramUrl = getInstagramProfileUrl(profile.instagram);

	return (
		<Card className="bg-card border-border">
			<CardHeader className="px-6 pt-5 pb-4 border-b border-border">
				<CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					Acquisition
				</CardTitle>
			</CardHeader>
			<CardContent className="px-6 py-5 flex flex-col gap-5">
				<ProfileField
					label="Instagram"
					value={getSafeValue(profile.instagram)}
				/>
				<ProfileField
					label="Lead Source"
					value={getLeadSourceLabel(profile.heardAboutUs)}
				/>
				<ProfileField
					label="Lead Source Detail"
					value={getSafeValue(profile.heardAboutUsOther)}
				/>
				<ProfileField
					label="Knows Existing Customer"
					value={profile.knowsExistingCustomer ? "Yes" : "No"}
				/>
				<ProfileField
					label="Known Customer"
					value={getSafeValue(profile.knownCustomerName)}
				/>
				{instagramUrl ? (
					<a
						href={instagramUrl}
						target="_blank"
						rel="noreferrer"
						className="text-sm font-medium text-primary underline-offset-4 hover:underline"
					>
						Open Instagram profile
					</a>
				) : null}
			</CardContent>
		</Card>
	);
}

function ReferenceContactsCard({ profile }: BankDetailsCardProps) {
	return (
		<Card className="bg-card border-border">
			<CardHeader className="px-6 pt-5 pb-4 border-b border-border">
				<CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					Reference Contacts
				</CardTitle>
			</CardHeader>
			<CardContent className="px-6 py-5 flex flex-col gap-5">
				<ProfileField label="Contact 1" value={profile.contact1Name} />
				<ProfileField label="Contact 1 Phone" value={profile.contact1Phone} />
				<ProfileField
					label="Contact 1 Relationship"
					value={profile.contact1Relationship}
				/>
				<ProfileField
					label="Contact 2"
					value={getSafeValue(profile.contact2Name)}
				/>
				<ProfileField
					label="Contact 2 Phone"
					value={getSafeValue(profile.contact2Phone)}
				/>
				<ProfileField
					label="Contact 2 Relationship"
					value={getSafeValue(profile.contact2Relationship)}
				/>
			</CardContent>
		</Card>
	);
}

interface ProfileReviewPanelProps {
	profile: CustomerProfileResponseDto;
}

const STATUS_STYLES: Record<
	string,
	{ container: string; text: string; label: string }
> = {
	PENDING: {
		container: "bg-amber-500/10 border border-amber-500/20",
		text: "text-amber-400",
		label: "Pending",
	},
	APPROVED: {
		container: "bg-emerald-500/10 border border-emerald-500/20",
		text: "text-emerald-400",
		label: "Approved",
	},
	REJECTED: {
		container: "bg-destructive/10 border border-destructive/20",
		text: "text-destructive",
		label: "Rejected",
	},
};

export function ProfileReviewPanel({ profile }: ProfileReviewPanelProps) {
	const [notes, setNotes] = useState("");
	const reviewNotesId = useId();

	const statusStyle = STATUS_STYLES[profile.status] ?? STATUS_STYLES["PENDING"];

	const submittedAgo = formatDistanceToNow(new Date(profile.submittedAt), {
		addSuffix: true,
	});

	return (
		<Card className="bg-card border-border">
			<CardHeader className="px-6 pt-5 pb-4">
				<CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					Profile Review
				</CardTitle>
			</CardHeader>

			<CardContent className="px-6 pb-6 flex flex-col gap-5">
				{/* Status badge */}
				<div
					className={cn(
						"flex items-center gap-3 rounded-lg px-4 py-3",
						statusStyle.container,
					)}
				>
					<ClipboardCheck className={cn("h-5 w-5", statusStyle.text)} />
					<div>
						<p className={cn("text-sm font-semibold", statusStyle.text)}>
							Status: {statusStyle.label}
						</p>
						<p className="text-xs text-muted-foreground">
							Submitted {submittedAgo}
						</p>
					</div>
				</div>

				{/* Review notes */}
				<div className="flex flex-col gap-2">
					<label
						htmlFor={reviewNotesId}
						className="text-xs text-muted-foreground"
					>
						Review Notes
					</label>
					<Textarea
						id={reviewNotesId}
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						placeholder="Add optional internal notes..."
						className="bg-muted border-transparent resize-none min-h-24 text-sm"
					/>
				</div>

				{/* Actions */}
				<div className="flex flex-col gap-2">
					<Button className="w-full bg-foreground text-background hover:bg-foreground/90">
						Approve Profile
					</Button>
					<Button variant="outline" className="w-full">
						Reject / Request Edits
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

interface ProfileFieldProps {
	label: string;
	value: string;
}

export function ProfileField({ label, value }: ProfileFieldProps) {
	return (
		<div>
			<p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
				{label}
			</p>
			<p className="text-sm font-medium text-foreground">{value}</p>
		</div>
	);
}

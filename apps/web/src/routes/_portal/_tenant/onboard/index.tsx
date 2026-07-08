import type { AuthCustomerDto } from "@repo/api-contracts";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { authQueries } from "@/features/tenant-management/auth/auth.queries";
import { RentalHeaderAuthAction } from "@/features/tenant-management/auth/components/rental-header-auth-action";
import { rentalCustomerQueries } from "@/features/tenant-management/customer/rental-customer.queries";
import { CustomerProfileOnboardingForm } from "@/features/tenant-management/customer/submit-customer-profile/components/customer-profile-onboarding-form";
import {
	type CustomerProfileOnboardingPrefillValues,
	createCustomerProfileOnboardingPrefillValues,
	fromCustomerProfileDetailToOnboardingPrefillValues,
	toCustomerProfileOnboardingFormValues,
} from "@/features/tenant-management/customer/submit-customer-profile/components/customer-profile-onboarding-form.schema";
import { getTenantBranding } from "@/features/tenant-management/tenant-context/tenant-branding";
import { getProblemDetailsStatus } from "@/shared/errors";

interface OnboardLoaderData {
	customerId: string;
	mode: "submit" | "resubmit";
	initialValues: CustomerProfileOnboardingPrefillValues;
}

export const Route = createFileRoute("/_portal/_tenant/onboard/")({
	loader: async ({ context: { queryClient } }): Promise<OnboardLoaderData> => {
		const user = await queryClient.ensureQueryData(authQueries.currentUser());

		if (user.actorType !== "TENANT_CUSTOMER") {
			throw redirect({ to: "/login" });
		}

		let submittedProfile = null;

		try {
			submittedProfile = await queryClient.ensureQueryData(
				rentalCustomerQueries.currentProfile(),
			);
		} catch (error) {
			if (getProblemDetailsStatus(error) !== 404) {
				throw error;
			}
		}

		if (user.onboardingStatus === "APPROVED") {
			throw redirect({ to: "/rental" });
		}

		if (user.onboardingStatus === "PENDING" && submittedProfile) {
			throw redirect({ to: "/rental" });
		}

		if (user.onboardingStatus === "REJECTED") {
			return {
				customerId: user.id,
				mode: "resubmit" as const,
				initialValues: submittedProfile
					? fromCustomerProfileDetailToOnboardingPrefillValues(
							submittedProfile.profile,
						)
					: createCustomerProfileOnboardingPrefillValues(),
			};
		}

		return {
			customerId: user.id,
			mode: "submit" as const,
			initialValues: createCustomerProfileOnboardingPrefillValues(),
		};
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { tenantContext, user } = Route.useRouteContext();
	const { customerId, initialValues, mode } = Route.useLoaderData();
	const defaultValues = toCustomerProfileOnboardingFormValues(initialValues);

	const branding = getTenantBranding(tenantContext.tenant);

	return (
		<div className="space-y-10 min-h-svh bg-neutral-50">
			<header className="sticky top-0 z-10 bg-white border-b">
				<div className="container flex items-center justify-between h-16 mx-auto px-4">
					<div className="flex items-center gap-4 transition-all">
						{branding.logoSrc ? (
							<img
								src={branding.logoSrc}
								alt={branding.tenantName}
								className="h-10 w-auto object-contain"
							/>
						) : (
							<span className="text-xl font-bold text-primary">
								{branding.tenantName}
							</span>
						)}
						<nav className="hidden md:flex gap-4 text-sm font-medium">
							<Button variant="ghost" className="text-primary">
								Rental
							</Button>
						</nav>
					</div>

					<div className="flex items-center gap-1">
						<RentalHeaderAuthAction user={user as AuthCustomerDto | null} />
					</div>
				</div>
			</header>

			<main className="py-10">
				<CustomerProfileOnboardingForm
					customerId={customerId}
					tenantName={branding.tenantName}
					defaultValues={defaultValues}
					mode={mode}
				/>
			</main>
		</div>
	);
}

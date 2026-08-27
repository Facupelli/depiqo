import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { requireStorefrontCustomerSession } from "@/modules/tenant-management/auth/customer-session.policy";
import { useCurrentRentalCustomerProfile } from "@/modules/tenant-management/customer/customer-profile.queries";
import { fromCustomerProfileToOnboardingFormValues } from "@/modules/tenant-management/customer/onboarding/customer-onboarding.schema";
import { CustomerOnboardingForm } from "@/modules/tenant-management/customer/onboarding/customer-onboarding-form";

export const Route = createFileRoute("/onboard")({
	beforeLoad: async ({ context }) => {
		if (!context.tenantContext || context.tenantContext.face !== "storefront") {
			throw notFound();
		}

		const customer = await requireStorefrontCustomerSession("/onboard");
		return { customer, storefrontTenant: context.tenantContext };
	},
	component: OnboardPage,
});

function OnboardPage() {
	const { customer, storefrontTenant } = Route.useRouteContext();
	const profileQuery = useCurrentRentalCustomerProfile();

	if (profileQuery.isPending) return <OnboardPageSkeleton />;
	if (profileQuery.isError) return <ProfileLoadError />;

	const profile = profileQuery.data;
	if (!profile) {
		return (
			<OnboardPageLayout title="Completá tu perfil">
				<CustomerOnboardingForm
					customerId={customer.id}
					tenantName={storefrontTenant.tenant.name}
					mode="submit"
				/>
			</OnboardPageLayout>
		);
	}

	if (profile.onboardingStatus === "REJECTED") {
		return (
			<OnboardPageLayout title="Necesitamos que revises tu solicitud">
				<div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
					<p className="font-semibold text-destructive">Solicitud rechazada</p>
					<p className="mt-1 text-muted-foreground">
						{profile.profile.rejectionReason ??
							"Revisá tus datos y reenviá la solicitud."}
					</p>
				</div>
				<CustomerOnboardingForm
					customerId={customer.id}
					defaultValues={fromCustomerProfileToOnboardingFormValues(
						profile.profile,
					)}
					tenantName={storefrontTenant.tenant.name}
					mode="resubmit"
				/>
			</OnboardPageLayout>
		);
	}

	if (profile.onboardingStatus === "PENDING") {
		return (
			<OnboardPageLayout title="Estado de tu perfil">
				<ProfileStatus status="PENDING" />
			</OnboardPageLayout>
		);
	}

	if (profile.onboardingStatus === "APPROVED") {
		return (
			<OnboardPageLayout title="Estado de tu perfil">
				<ProfileStatus status="APPROVED" />
			</OnboardPageLayout>
		);
	}

	return <ProfileLoadError />;
}

function OnboardPageLayout({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<main className="min-h-svh bg-neutral-100 px-4 py-12">
			<section className="mx-auto w-full max-w-2xl rounded-xl border bg-white p-6 shadow-sm sm:p-8">
				<h1 className="text-2xl font-bold tracking-tight">{title}</h1>
				<div className="mt-6">{children}</div>
			</section>
		</main>
	);
}

function ProfileStatus({ status }: { status: "PENDING" | "APPROVED" }) {
	const isPending = status === "PENDING";
	return (
		<div className="rounded-lg border p-6 text-center">
			<h2 className="text-xl font-semibold">
				{isPending ? "Solicitud en revisión" : "Perfil aprobado"}
			</h2>
			<p className="mt-2 text-sm leading-6 text-muted-foreground">
				{isPending
					? "Estamos revisando tus datos. Te avisaremos cuando tu perfil esté aprobado."
					: "Tu perfil fue aprobado y ya podés continuar con tus alquileres."}
			</p>
		</div>
	);
}

function OnboardPageSkeleton() {
	return (
		<main className="min-h-svh bg-neutral-100 px-4 py-12">
			<section className="mx-auto w-full max-w-2xl space-y-6 rounded-xl border bg-white p-6 shadow-sm sm:p-8">
				<Skeleton className="h-8 w-56" />
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-80 w-full" />
			</section>
		</main>
	);
}

function ProfileLoadError() {
	return (
		<OnboardPageLayout title="No pudimos cargar tu perfil">
			<p className="text-sm text-muted-foreground">
				Intentá recargar la página. Si el problema continúa, contactá al equipo
				de alquiler.
			</p>
			<Button className="mt-4" onClick={() => window.location.reload()}>
				Reintentar
			</Button>
		</OnboardPageLayout>
	);
}

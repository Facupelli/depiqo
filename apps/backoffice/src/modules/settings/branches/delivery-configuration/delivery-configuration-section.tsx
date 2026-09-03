import { Alert, AlertDescription } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { PackageOpen } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useCurrentBusiness } from "@/application/current-business/current-business.queries";
import { ProblemDetailsError } from "@/shared/errors";
import { usePutDeliveryConfiguration } from "./delivery-configuration.mutation";
import { useDeliveryConfiguration } from "./delivery-configuration.queries";
import {
	createDeliveryConfigurationFormDefaults,
	type DeliveryConfigurationFormValues,
	toDeliveryConfigurationFormDefaults,
	toPutDeliveryConfigurationBodyDto,
} from "./delivery-configuration.schema";
import { DeliveryConfigurationForm } from "./delivery-configuration-form";

type DeliveryConfigurationSectionProps = {
	branchId: string;
};

export function DeliveryConfigurationSection({
	branchId,
}: DeliveryConfigurationSectionProps) {
	const configurationQuery = useDeliveryConfiguration(branchId);
	const { data: business } = useCurrentBusiness();
	const { mutateAsync: saveConfiguration, isPending } =
		usePutDeliveryConfiguration();
	const [isConfiguring, setIsConfiguring] = useState(false);
	const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(
		null,
	);

	async function handleSubmit(
		values: DeliveryConfigurationFormValues,
	): Promise<boolean> {
		setSubmitErrorMessage(null);
		try {
			await saveConfiguration({
				branchId,
				body: toPutDeliveryConfigurationBodyDto(values),
			});
			toast.success("Configuración de delivery guardada");
			return true;
		} catch (error) {
			setSubmitErrorMessage(getDeliverySaveErrorMessage(error));
			return false;
		}
	}

	if (configurationQuery.isPending || !business) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-36 w-full" />
				<Skeleton className="h-64 w-full" />
			</div>
		);
	}

	if (configurationQuery.isError) {
		return (
			<Alert variant="destructive">
				<AlertDescription className="flex flex-wrap items-center justify-between gap-3">
					<span>No pudimos cargar la configuración de delivery.</span>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => configurationQuery.refetch()}
					>
						Reintentar
					</Button>
				</AlertDescription>
			</Alert>
		);
	}

	const configuration = configurationQuery.data;
	if (!configuration && !isConfiguring) {
		return (
			<Card className="border-dashed">
				<CardContent className="flex flex-col items-center px-6 py-12 text-center">
					<div className="mb-4 flex size-11 items-center justify-center rounded-full bg-muted">
						<PackageOpen className="size-5 text-muted-foreground" />
					</div>
					<h2 className="font-semibold">Delivery no configurado</h2>
					<p className="mt-2 max-w-md text-sm text-muted-foreground">
						Configura la cobertura, precios, horarios y tiempo de reserva de
						transporte.
					</p>
					<Button
						type="button"
						className="mt-5"
						onClick={() => setIsConfiguring(true)}
					>
						Configurar delivery
					</Button>
				</CardContent>
			</Card>
		);
	}

	const defaultValues = configuration
		? toDeliveryConfigurationFormDefaults(configuration)
		: createDeliveryConfigurationFormDefaults(business.config.pricing.currency);

	return (
		<DeliveryConfigurationForm
			key={configuration ? JSON.stringify(configuration) : "new-configuration"}
			defaultValues={defaultValues}
			isPending={isPending}
			submitErrorMessage={submitErrorMessage}
			onSubmit={handleSubmit}
		/>
	);
}

function getDeliverySaveErrorMessage(error: unknown): string {
	if (error instanceof ProblemDetailsError) {
		return (
			error.problemDetails.detail ??
			error.problemDetails.title ??
			"No pudimos guardar la configuración de delivery."
		);
	}
	return "No pudimos guardar la configuración de delivery. Inténtalo nuevamente.";
}

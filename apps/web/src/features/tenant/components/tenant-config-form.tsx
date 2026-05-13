import { BookingMode, RoundingRule } from "@repo/types";
import { useForm } from "@tanstack/react-form";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CircleHelp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ProblemDetailsError } from "@/shared/errors";
import {
  tenantConfigFormSchema,
  tenantConfigToFormValues,
  toUpdateTenantConfigDto,
} from "../schemas/tenant-config-form.schema";
import { tenantQueries, useUpdateTenantConfig } from "../tenant.queries";

type TenantConfigSection = "pricing" | "general" | "insurance";

interface TenantConfigFormProps {
  section: TenantConfigSection;
}

export function TenantConfigForm({ section }: TenantConfigFormProps) {
  const { form, hasDailyBillingUnits, submitErrorMessage, isPending } =
    useTenantConfigSettingsForm();

	function renderSectionFields() {
		switch (section) {
			case "pricing":
				return (
					<PricingSettingsFields
						form={form}
						hasDailyBillingUnits={hasDailyBillingUnits}
					/>
				);
			case "insurance":
				return <InsuranceSettingsFields form={form} />;
			case "general":
				return (
					<GeneralSettingsFields
						form={form}
					/>
				);
		}
	}

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-6"
    >
		{renderSectionFields()}

      {submitErrorMessage ? (
        <p className="text-sm text-destructive">{submitErrorMessage}</p>
      ) : null}

      <div className="flex justify-end">
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
        >
          {([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit || isPending}>
              {isSubmitting || isPending
                ? "Guardando..."
                : "Guardar configuración"}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}

function useTenantConfigSettingsForm() {
  const { data: tenant } = useSuspenseQuery(tenantQueries.me());
  const { mutateAsync: updateConfig, isPending } = useUpdateTenantConfig();
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(
    null,
  );
  const hasDailyBillingUnits = tenant.billingUnits.some(
    (billingUnit) => billingUnit.durationMinutes === 1440,
  );

  const form = useForm({
    defaultValues: tenantConfigToFormValues(tenant.config),
    validators: {
      onSubmit: tenantConfigFormSchema,
    },
    onSubmit: async ({ value }) => {
      const dto = toUpdateTenantConfigDto(value);

      try {
        setSubmitErrorMessage(null);
        await updateConfig(dto);
        toast.success("Configuración guardada");
      } catch (error) {
        const submitError = getSubmitError(error);

        if (submitError) {
          setSubmitErrorMessage(submitError.message);
          return;
        }

        throw error;
      }
    },
  });

  return {
    form,
    hasDailyBillingUnits,
    submitErrorMessage,
    isPending,
  };
}

type TenantConfigSettingsFormApi = ReturnType<
  typeof useTenantConfigSettingsForm
>["form"];

function PricingSettingsFields({
  form,
  hasDailyBillingUnits,
}: {
  form: TenantConfigSettingsFormApi;
  hasDailyBillingUnits: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card divide-y divide-border">
      {hasDailyBillingUnits ? (
        <>
          <form.Field name="weekendCountsAsOne">
            {(field) => (
              <div className="grid grid-cols-[1fr_auto] items-start gap-8 px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Sistema day/weekend
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Si Sabado y Domingo quedan ocupados, cuentan como una sola
                    unidad de facturación en alquileres diarios.
                  </p>
                </div>
                <div className="pt-1">
                  <Switch
                    checked={field.state.value}
                    onCheckedChange={field.handleChange}
                    aria-label="Toggle weekend billing"
                  />
                </div>
              </div>
            )}
          </form.Field>

          <form.Field name="roundingRule">
            {(field) => (
              <div className="grid grid-cols-[1fr_auto] items-start gap-8 px-5 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      Comportamiento de cobro diario
                    </p>
                    <Popover>
                      <PopoverTrigger
                        render={
                          <button
                            type="button"
                            aria-label="Más información sobre el comportamiento de cobro diario"
                            className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <CircleHelp className="h-3.5 w-3.5" />
                          </button>
                        }
                      />
                      <PopoverContent align="start" sideOffset={8} className="w-80 gap-2">
                        <PopoverHeader className="gap-2">
                          <PopoverTitle>Cómo funciona cada opción</PopoverTitle>
                          <PopoverDescription className="space-y-3 text-xs leading-5">
                            <p>
                              <span className="font-medium text-foreground">
                                No cobrar la fracción restante:
                              </span>{" "}
                              solo cobra días completos de 24 horas. Si el alquiler supera un día pero no alcanza el siguiente completo, no suma otra unidad.
                            </p>
                            <p>
                              <span className="font-medium text-foreground">
                                Cobrar desde media jornada extra:
                              </span>{" "}
                              suma la siguiente unidad recién cuando se supera la mitad del próximo día. Por ejemplo, hasta 36 horas cobra 1 unidad; desde 36 horas y 1 minuto cobra 2.
                            </p>
                            <p>
                              <span className="font-medium text-foreground">
                                Cobrar cualquier fracción extra:
                              </span>{" "}
                              cualquier tiempo adicional después de un día completo suma una nueva unidad.
                            </p>
                          </PopoverDescription>
                        </PopoverHeader>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Define cómo se cobra el tiempo adicional una vez cumplida
                    cada jornada de 24 horas.
                  </p>
                </div>
                <Select
                  value={field.state.value}
                  onValueChange={(v) => field.handleChange(v as RoundingRule)}
                  items={[
                    {
                      value: RoundingRule.IGNORE_PARTIAL_DAY,
                      label: "No cobrar la fracción restante",
                    },
                    {
                      value: RoundingRule.BILL_OVER_HALF_DAY,
                      label: "Cobrar desde media jornada extra",
                    },
                    {
                      value: RoundingRule.BILL_ANY_PARTIAL_DAY,
                      label: "Cobrar cualquier fracción extra",
                    },
                  ]}
                >
                  <SelectTrigger className="w-[20rem] max-w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={RoundingRule.IGNORE_PARTIAL_DAY}>
                      No cobrar la fracción restante
                    </SelectItem>
                    <SelectItem value={RoundingRule.BILL_OVER_HALF_DAY}>
                      Cobrar desde media jornada extra
                    </SelectItem>
                    <SelectItem value={RoundingRule.BILL_ANY_PARTIAL_DAY}>
                      Cobrar cualquier fracción extra
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>
        </>
      ) : null}

      <form.Field name="currency">
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid;

          return (
            <div className="grid grid-cols-[1fr_auto] items-start gap-8 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Default currency
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ISO 4217 code (e.g. USD, ARS, EUR).
                </p>
              </div>
              <Field data-invalid={isInvalid} className="items-end pt-1">
                <FieldLabel htmlFor={field.name} className="sr-only">
                  Default currency
                </FieldLabel>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) =>
                    field.handleChange(e.target.value.toUpperCase())
                  }
                  onBlur={field.handleBlur}
                  maxLength={3}
                  className="w-24 text-right uppercase"
                  placeholder="ARS"
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            </div>
          );
        }}
      </form.Field>

      <form.Field name="locale">
        {(field) => (
          <div className="grid grid-cols-[1fr_auto] items-start gap-8 px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Locale</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Como se muestra el precio en la aplicación.
              </p>
            </div>
            <Select
              value={field.state.value}
              onValueChange={(value) => value && field.handleChange(value)}
              items={[
                { value: "es-AR", label: "Español (AR)" },
                { value: "es-ES", label: "Español (ES)" },
                { value: "en-US", label: "Inglés (US)" },
              ]}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="es-AR">Español (AR)</SelectItem>
                <SelectItem value="es-ES">Español (ES)</SelectItem>
                <SelectItem value="en-US">Inglés (US)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </form.Field>
    </div>
	);
}

function InsuranceSettingsFields({
	form,
}: {
	form: TenantConfigSettingsFormApi;
}) {
	return (
		<div className="rounded-xl border border-border bg-card divide-y divide-border">
			<form.Field name="insuranceEnabled">
				{(field) => (
					<div className="grid grid-cols-[1fr_auto] items-start gap-8 px-5 py-4">
						<div>
							<p className="text-sm font-semibold text-foreground">
								Habilitar seguro de equipos
							</p>
							<p className="mt-0.5 text-xs text-muted-foreground">
								Muestra la opción de seguro en la tienda y permite aplicarlo a
								los pedidos.
							</p>
						</div>
						<div className="pt-1">
							<Switch
								checked={field.state.value}
								onCheckedChange={field.handleChange}
								aria-label="Habilitar seguro de equipos"
							/>
						</div>
					</div>
				)}
			</form.Field>

			<form.Subscribe
				selector={(state) => state.values.insuranceEnabled}
				children={(insuranceEnabled) => (
					<form.Field name="insuranceRatePercent">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;

							return (
								<div className="grid grid-cols-[1fr_auto] items-start gap-8 px-5 py-4">
									<div>
										<p className="text-sm font-semibold text-foreground">
											Porcentaje del seguro
										</p>
										<p className="mt-0.5 text-xs text-muted-foreground">
											Porcentaje aplicado sobre el subtotal antes de descuentos.
											Debe estar entre 0 y 100.
										</p>
									</div>
									<Field data-invalid={isInvalid} className="items-end pt-1">
										<FieldLabel htmlFor={field.name} className="sr-only">
											Porcentaje del seguro
										</FieldLabel>
										<div className="flex items-center gap-2">
											<Input
												id={field.name}
												type="number"
												min={0}
												max={100}
												step={0.1}
												value={field.state.value}
												onChange={(e) => field.handleChange(Number(e.target.value))}
												onBlur={field.handleBlur}
												disabled={!insuranceEnabled}
												className="w-24 text-right"
											/>
											<span className="text-sm text-muted-foreground">%</span>
										</div>
										{isInvalid && <FieldError errors={field.state.meta.errors} />}
									</Field>
								</div>
							);
						}}
					</form.Field>
				)}
			/>
		</div>
	);
}

function getSubmitError(error: unknown) {
  if (error instanceof ProblemDetailsError) {
    return {
      message:
        error.problemDetails.detail ??
        "No se pudo guardar la configuración.",
    };
  }

  return null;
}

function GeneralSettingsFields({
  form,
}: {
  form: TenantConfigSettingsFormApi;
}) {
  return (
    <div className="rounded-xl border border-border bg-card divide-y divide-border">
      <form.Field name="bookingMode">
        {(field) => {
          const errors =
            field.state.meta.errors
          const isInvalid =
            (field.state.meta.isTouched && !field.state.meta.isValid) 

          return (
            <div className="grid grid-cols-[1fr_auto] items-start gap-8 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Modo de reserva
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Elegí si las reservas se confirman automáticamente o si
                  primero deben ser revisadas por tu equipo.
                </p>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {field.state.value === BookingMode.INSTANT_BOOK ? (
                    <p>
                      Las reservas se confirman al finalizar el checkout y el
                      inventario queda reservado en ese momento.
                    </p>
                  ) : (
                    <>
                      <p>
                        Los clientes envían una solicitud de reserva. El
                        inventario no se bloquea hasta que tu equipo apruebe la
                        solicitud.
                      </p>
                      <p>
                        La aprobación puede fallar si la disponibilidad cambia
                        antes de la revisión.
                      </p>
                    </>
                  )}
                </div>
              </div>
              <Field data-invalid={isInvalid} className="items-end pt-1">
                <FieldLabel htmlFor={field.name} className="sr-only">
                  Modo de reserva
                </FieldLabel>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => value && field.handleChange(value)}
                  items={[
                    {
                      value: BookingMode.INSTANT_BOOK,
                      label: "Reserva inmediata",
                    },
                    {
                      value: BookingMode.REQUEST_TO_BOOK,
                      label: "Solicitud de reserva",
                    },
                  ]}
                >
                  <SelectTrigger className="w-52">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={BookingMode.INSTANT_BOOK}>
                      Reserva inmediata
                    </SelectItem>
                    <SelectItem value={BookingMode.REQUEST_TO_BOOK}>
                      Solicitud de reserva
                    </SelectItem>
                  </SelectContent>
                </Select>
                {errors.length > 0 ? <FieldError errors={errors} /> : null}
              </Field>
            </div>
          );
        }}
      </form.Field>

      <form.Field name="timezone">
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid;

          return (
            <div className="grid grid-cols-[1fr_auto] items-start gap-8 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Timezone
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  IANA timezone identifier (e.g. America/Argentina/Jujuy).
                </p>
              </div>
              <Field data-invalid={isInvalid} className="items-end pt-1">
                <FieldLabel htmlFor={field.name} className="sr-only">
                  Timezone
                </FieldLabel>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  className="w-56 text-right"
                  placeholder="UTC"
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            </div>
          );
        }}
      </form.Field>

      <form.Field name="newArrivalsWindowDays">
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid;

          return (
            <div className="grid grid-cols-[1fr_auto] items-start gap-8 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  New arrivals window
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Days a product is shown as "new" after being added.
                </p>
              </div>
              <Field data-invalid={isInvalid} className="items-end pt-1">
                <div className="flex items-center gap-2">
                  <Input
                    id={field.name}
                    type="number"
                    min={1}
                    step={1}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                    onBlur={field.handleBlur}
                    className="w-24 text-right"
                  />
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            </div>
          );
        }}
      </form.Field>
    </div>
  );
}

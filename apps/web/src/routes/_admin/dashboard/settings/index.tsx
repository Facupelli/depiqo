import type { BillingUnitListResponse } from "@repo/schemas";
import { useForm } from "@tanstack/react-form";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarClock, CalendarDays, Clock, Grid2x2, Sun } from "lucide-react";
import z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useBillingUnits } from "@/features/billing-unit/billing-unit.queries";
import { useSyncTenantBillingUnits } from "@/features/tenant/billing-unit/tenant-billing.queries";
import { TenantBrandingSection } from "@/features/tenant/components/tenant-branding-section";
import { TenantConfigForm } from "@/features/tenant/components/tenant-config-form";
import { CustomDomainSection } from "@/features/tenant/custom-domain/components/custom-domain-section";
import { tenantQueries } from "@/features/tenant/tenant.queries";
import { UserProfileSettingsSection } from "@/features/user-profile/components/user-profile-settings-section";
import { cn } from "@/lib/utils";
import { AdminRouteError } from "@/shared/components/admin-route-error";

const SETTINGS_SECTIONS = [
  "branding",
  "owner-profile",
  "domain",
  "general",
  "billing-units",
  "category-grouping",
  "pricing",
  "insurance",
] as const;

type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

const settingsSearchSchema = z.object({
  section: z.enum(SETTINGS_SECTIONS).default("branding"),
});

const settingsNavGroups: Array<{
  title: string;
  items: Array<{
    key: SettingsSection;
    label: string;
    description: string;
  }>;
}> = [
  {
    title: "Rental",
    items: [
      {
        key: "general",
        label: "General",
        description: "Reservas, comunicación de pedidos y ajustes del catálogo.",
      },
      {
        key: "branding",
        label: "Marca",
        description: "Visual identity and tenant presentation.",
      },
      {
        key: "owner-profile",
        label: "Remito",
        description: "Datos legales y firma del titular del rental.",
      },
      {
        key: "domain",
        label: "Dominio",
        description: "Custom domain and storefront access.",
      },
    ],
  },
  {
    title: "Catálogo",
    items: [
      {
        key: "billing-units",
        label: "Unidad de cobro",
        description:
          "Define los períodos de tiempo disponibles para cobrar tus alquileres.",
      },
      {
        key: "category-grouping",
        label: "Categorías",
        description: "Rules for how bundle items are grouped by category.",
      },
    ],
  },
  {
    title: "Precios",
    items: [
      {
        key: "pricing",
        label: "Pricing",
        description: "Currency, rounding, and pricing behavior.",
      },
      {
        key: "insurance",
        label: "Seguro de equipos",
        description: "Aplica un seguro de equipos a los pedidos.",
      },
    ],
  },
];

const settingsSectionMeta = Object.fromEntries(
  settingsNavGroups.flatMap((group) =>
    group.items.map((item) => [
      item.key,
      {
        title: item.label,
        description: item.description,
        groupTitle: group.title,
      },
    ]),
  ),
) as Record<
  SettingsSection,
  { title: string; description: string; groupTitle: string }
>;

export const Route = createFileRoute("/_admin/dashboard/settings/")({
  validateSearch: settingsSearchSchema,
  errorComponent: ({ error }) => {
    return (
      <AdminRouteError
        error={error}
        genericMessage="No pudimos cargar la configuración."
        forbiddenMessage="No tienes permisos para ver la configuración."
      />
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate({ from: Route.fullPath });
  const { section } = Route.useSearch();
  const activeSection = settingsSectionMeta[section];

  function handleSectionChange(nextSection: SettingsSection) {
    navigate({
      search: () => ({
        section: nextSection,
      }),
      replace: true,
    });
  }

  return (
    <div className="space-y-8 p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ajustes</h1>
          <p className="text-sm text-muted-foreground">
            Maneja tus ajustes del rental.
          </p>
        </div>
      </div>

      <div className="grid gap-12 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]">
        <SettingsSectionNav
          activeSection={section}
          onSectionChange={handleSectionChange}
        />

        <div className="min-w-0 space-y-6">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {activeSection.groupTitle}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">
              {activeSection.title}
            </h2>
            <p className="text-sm text-muted-foreground">
              {activeSection.description}
            </p>
          </div>

          <SettingsPanel section={section} />
        </div>
      </div>
    </div>
  );
}

function SettingsSectionNav({
  activeSection,
  onSectionChange,
}: {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}) {
  return (
    <div className="lg:sticky lg:top-8 lg:self-start">
      <div className="rounded-2xl border bg-card p-3 shadow-xs">
        {settingsNavGroups.map((group, groupIndex) => (
          <div
            key={group.title}
            className={cn("space-y-1.5", groupIndex > 0 && "mt-5")}
          >
            <p className="px-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {group.title}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = item.key === activeSection;

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onSectionChange(item.key)}
                    className={cn(
                      "flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition-colors",
                      isActive
                        ? "bg-muted text-foreground font-medium"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsPanel({ section }: { section: SettingsSection }) {
  switch (section) {
    case "branding":
      return <TenantBrandingSection />;
    case "owner-profile":
      return <UserProfileSettingsSection />;
    case "domain":
      return <CustomDomainSection />;
    case "general":
      return <TenantConfigForm section="general" />;
    case "billing-units":
      return <BillingUnitsSettingsPanel />;
    case "category-grouping":
      return <CategoryGroupingSettingsPanel />;
    case "pricing":
      return <TenantConfigForm section="pricing" />;
    case "insurance":
      return <TenantConfigForm section="insurance" />;
  }
}

function BillingUnitsSettingsPanel() {
  const { data: billingUnits = [], isPending, isError } = useBillingUnits();

  if (isPending) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Loading billing units...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-destructive">
            We couldn&apos;t load the billing units.
          </p>
        </CardContent>
      </Card>
    );
  }

  return <ActiveBillingUnitsForm billingUnits={billingUnits} />;
}

function CategoryGroupingSettingsPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Category grouping rules</CardTitle>
        <CardDescription>
          This section is ready for the next catalog setting pass.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Use this area for settings that control how bundle items are grouped
          and ordered by category in the storefront.
        </p>
        <div className="rounded-xl border border-dashed bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Upcoming setting: category importance for bundle grouping.
        </div>
      </CardContent>
    </Card>
  );
}

const ICON_MAP: Record<string, React.ElementType> = {
  hourly: Clock,
  "half-day": Sun,
  daily: CalendarDays,
  weekly: Grid2x2,
  monthly: CalendarClock,
};

function resolveIcon(label: string): React.ElementType {
  const key = label.toLowerCase();
  const match = Object.keys(ICON_MAP).find((iconKey) => key.includes(iconKey));

  return match ? ICON_MAP[match] : Clock;
}

const formatDuration = (minutes: number): string => {
  const units = [
    { limit: 60, divisor: 1, suffix: "m" },
    { limit: 1440, divisor: 60, suffix: "h" },
    { limit: 10080, divisor: 1440, suffix: "d" },
    { limit: Infinity, divisor: 10080, suffix: "w" },
  ];

  const unit =
    units.find((currentUnit) => minutes < currentUnit.limit) ??
    units[units.length - 1];

  return `${Math.floor(minutes / unit.divisor)}${unit.suffix}`;
};

interface ActiveBillingUnitsFormProps {
  billingUnits: BillingUnitListResponse;
}

export function ActiveBillingUnitsForm({
  billingUnits,
}: ActiveBillingUnitsFormProps) {
  const { data: tenant } = useSuspenseQuery(tenantQueries.me());

  const { mutate: syncBillingUnits } = useSyncTenantBillingUnits({
    onSuccess: () => {
      console.log("sucess");
    },
    onError: (error) => {
      console.log({ error });
    },
  });

  const form = useForm({
    defaultValues: {
      billingUnitIds: tenant.billingUnits.map((unit) => unit.billingUnitId),
    },
    onSubmit: ({ value }) => {
      syncBillingUnits(value);
    },
  });

  return (
    <section className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-6"
      >
        <form.Field
          name="billingUnitIds"
          validators={{
            onSubmit: ({ value }) =>
              value.length !== 1
                ? "Select exactly one billing unit."
                : undefined,
          }}
        >
          {(field) => {
            const enabled = new Set(field.state.value);

            function toggle(id: string) {
              field.handleChange(enabled.has(id) ? [] : [id]);
            }

            return (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {billingUnits
                  .slice()
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((unit) => {
                    const Icon = resolveIcon(unit.label);
                    const isEnabled = enabled.has(unit.id);

                    return (
                      <div
                        key={unit.id}
                        className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:bg-card/80"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <Icon className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold leading-none text-foreground">
                            {unit.label}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDuration(unit.durationMinutes)}
                          </p>
                        </div>

                        <Switch
                          checked={isEnabled}
                          onCheckedChange={() => toggle(unit.id)}
                          aria-label={`Toggle ${unit.label}`}
                        />
                      </div>
                    );
                  })}
              </div>
            );
          }}
        </form.Field>

        {form.state.errors.length > 0 && (
          <p className="text-sm text-destructive">{form.state.errors[0]}</p>
        )}

        <div className="flex justify-end">
          <Button type="submit">Save Billing Units</Button>
        </div>
      </form>
    </section>
  );
}

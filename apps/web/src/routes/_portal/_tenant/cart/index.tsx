import { createFileRoute, useSearch } from "@tanstack/react-router";
import z from "zod";
import { CartPageProvider } from "@/features/rental/cart/cart-page.context";
import { CartPageConflictPanel } from "@/features/rental/cart/components/cartpage-conflict-panel";
import { CartPageItemList } from "@/features/rental/cart/components/cartpage-itemlist";
import { CartPagePeriod } from "@/features/rental/cart/components/cartpage-period";
import { CartPageSidebar } from "@/features/rental/cart/components/cartpage-sidebar";
import { rentalTenantQueries } from "@/features/rental/tenant/tenant.queries";
import { rentalLocationQueries } from "@/features/tenant/locations/locations.queries";

const cartPageSearchSchema = z.object({
  pickupDate: z.iso.date(),
  returnDate: z.iso.date(),
  locationId: z.string(),
});

export const Route = createFileRoute("/_portal/_tenant/cart/")({
  validateSearch: cartPageSearchSchema,
  component: CartPage,
  loader: async ({ context: { queryClient, tenantContext } }) => {
    await Promise.all([
      queryClient.ensureQueryData(
        rentalLocationQueries.list(tenantContext.tenant.id),
      ),
      queryClient.ensureQueryData(
        rentalTenantQueries.me(tenantContext.tenant.id),
      ),
    ]);
  },
});

function CartPage() {
  const { pickupDate, returnDate, locationId } = useSearch({
    from: "/_portal/_tenant/cart/",
  });

  return (
    <CartPageProvider
      pickupDate={pickupDate}
      returnDate={returnDate}
      locationId={locationId}
    >
      <div className="min-h-screen bg-neutral-50">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-8 md:py-12 space-y-8">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tight text-black">
              Revisa Tu Pedido
            </h1>
            <p className="mt-2 text-sm text-neutral-500">
              Revisa tu pedido y asegúrate de que todo está en orden.
            </p>
          </div>

          <CartPagePeriod />

          <CartPageConflictPanel />

          {/*
          CSS Grid — two-column layout:
          Left column owns the content flow.
          Right column is fixed-width sticky sidebar.
          Mobile: single column, sidebar stacks below.
        */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px] lg:items-start lg:gap-12">
            <CartPageItemList />
            <CartPageSidebar />
          </div>
        </div>
      </div>
    </CartPageProvider>
  );
}

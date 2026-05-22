import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  notFound,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";

import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";

import appCss from "../styles.css?url";

import type { QueryClient } from "@tanstack/react-query";
import { resolveTenantContext } from "@/features/tenant-context/resolve-tenant-context";
import type { ResolvedTenantContext } from "@repo/schemas";
import { NotFoundPage } from "@/components/not-found-page";
import { ServiceUnavailablePage } from "@/components/service-unavailable-page";
import { Toaster } from "@/components/ui/sonner";

export interface RouterContext {
  queryClient: QueryClient;
  tenantContext: ResolvedTenantContext;
}

const isDevEnv = import.meta.env.DEV;

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async () => {
    try {
      const tenantContext = await resolveTenantContext();
      return { tenantContext };
    } catch (error) {
      // NestJS returned 404 — unknown hostname
      if (
        error !== null &&
        typeof error === "object" &&
        "isNotFound" in error
      ) {
        throw notFound();
      }
      // Any other error (5xx, network failure) — let it bubble as 500
      throw error;
    }
  },
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Depiqo | Equipment Rental",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: () => <NotFoundPage />,
  errorComponent: () => <ServiceUnavailablePage />,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        {isDevEnv && (
          <TanStackDevtools
            config={{
              position: "bottom-left",
            }}
            plugins={[
              {
                name: "Tanstack Router",
                render: <TanStackRouterDevtoolsPanel />,
              },
              TanStackQueryDevtools,
            ]}
          />
        )}
        <Toaster />
        <Scripts />
      </body>
    </html>
  );
}

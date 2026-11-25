# Isolate server-rendered query caches

Backoffice and Storefront allocate a new QueryClient when creating a server router, rather than keeping a module-level singleton. Cloudflare Workers can reuse an isolate across requests, and the cache may hold user- or tenant-specific results. Router SSR integration transfers the current request's query state to its own browser instead of sharing cache state inside the worker. Backoffice's default freshness window keeps the browser from immediately refetching the hydrated prefetch results.

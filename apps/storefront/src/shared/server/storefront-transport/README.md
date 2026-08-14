# Storefront tenant-bound backend transport

```text
Browser / SSR loader
  -> createServerFn
  -> storefrontFunctionRequestContextMiddleware (reads Host and request ID)
  -> server application or composition function (StorefrontRequestContext)
  -> backend API helper (StorefrontRequestContext)
  -> trusted storefrontApiFetch
       -> resolve tenant context
       -> sign tenant token
       -> backend
```

Rules:

- Read request headers only at Storefront ingress boundaries, including server-function middleware and handlers with an actual `Request`.
- Pass `StorefrontRequestContext` explicitly below that boundary. Do not use ambient `getRequestHeader()` in application services or backend API helpers.
- Tenant-bound `createServerFn` handlers use `storefrontFunctionRequestContextMiddleware`. Client input contains only feature input, never trusted tenant or request context.
- The trusted `storefrontApiFetch` transport is the only layer that resolves trusted tenant context and signs the backend tenant token.
- Canonical-host redirect policy is separate from backend transport.

# Check browser origin at the Backoffice proxy

The Backoffice proxy validates the browser's `Origin` on state-changing requests at the same-origin boundary. It does not forward that header to NestJS: the upstream hop is server-to-server I/O and should not depend on the backend's browser CORS configuration.

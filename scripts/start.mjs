// Forces the standalone server to bind to all interfaces.
//
// .next/standalone/server.js listens on `process.env.HOSTNAME || '0.0.0.0'`.
// Container runtimes (Railway included) auto-inject HOSTNAME=<container id>
// as an OS-level env var, which overrides that default and makes the server
// bind only to an address the platform's edge proxy can't reach — the
// process logs "Ready" and looks healthy, but every request gets
// "Application failed to respond" (confirmed in production: server.js
// logged `http://<container-id>:8080` instead of `http://0.0.0.0:8080`).
process.env.HOSTNAME = "0.0.0.0";
await import("../.next/standalone/server.js");

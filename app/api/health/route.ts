export async function GET() {
  return Response.json({
    status: "ok",
    // Boolean only — never the value itself. Lets `curl .../api/health`
    // answer "is RESEND_API_KEY actually set in this environment" without
    // guessing or exposing the credential (see README's mail setup section).
    emailConfigured: Boolean(process.env.RESEND_API_KEY),
  });
}

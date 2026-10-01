export async function GET() {
  return Response.json({
    status: "ok",
    // Boolean only — never the value itself. Lets `curl .../api/health`
    // answer "is SMTP_URL actually set in this environment" without
    // guessing or exposing the credential (see README's mail setup section).
    emailConfigured: Boolean(process.env.SMTP_URL),
  });
}

import { sql } from "drizzle-orm";
import { db } from "@/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  let database: "up" | "down" = "up";
  try {
    await db.execute(sql`SELECT 1`);
  } catch {
    database = "down";
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "error",
        service: "dianpin-web",
        check: "database",
        message: "database connection failed",
      })
    );
  }

  return Response.json(
    {
      status: database === "up" ? "ok" : "error",
      database,
      // Boolean only — never expose the credential itself.
      emailConfigured: Boolean(process.env.RESEND_API_KEY),
    },
    {
      status: database === "up" ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

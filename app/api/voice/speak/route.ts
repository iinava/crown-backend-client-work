import { NextRequest } from "next/server";

/**
 * Voice XML callback — Vobiz calls this when the resident picks up.
 * Returns <Speak> XML that reads the reminder message via TTS.
 *
 * Flow:
 * 1. Cron → Vobiz Make Call API (answer_url points here)
 * 2. Vobiz dials the resident
 * 3. Resident picks up → Vobiz hits this URL
 * 4. We return XML → Vobiz reads message via TTS → hangs up
 */
export async function POST(request: NextRequest) {
  const message =
    request.nextUrl.searchParams.get("message") ??
    "Hello, this is a reminder from Crown Hostel. Please contact the hostel office regarding your pending rent payment. Thank you.";

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Speak voice="WOMAN" language="en-IN" loop="1">${escapeXml(message)}</Speak>
  <Hangup/>
</Response>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}

// Vobiz may also use GET
export async function GET(request: NextRequest) {
  return POST(request);
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

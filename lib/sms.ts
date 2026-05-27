/**
 * Vobiz Voice Call client for automated rent reminders.
 * Uses Text-to-Speech (TTS) — no DLT registration needed.
 *
 * How it works:
 * 1. We call Vobiz "Make Call" API with an answer_url
 * 2. Vobiz dials the resident
 * 3. Resident picks up → Vobiz hits our /api/voice/speak endpoint
 * 4. Our endpoint returns XML with <Speak> → Vobiz reads the message via TTS
 * 5. Message plays twice → call hangs up
 *
 * Cost: ~₹0.60/min (1 paisa/sec) → ~₹0.30 per 30-sec call
 * Credentials: Already in .env (VOBIZ_AUTH_ID, VOBIZ_AUTH_TOKEN)
 */

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface ReminderParams {
  residentName: string;
  amount: string;
  month: string;
  daysOverdue: number;
  fineAmount: string;
  totalDue: number;
}

/**
 * Normalize an Indian phone number to 10-digit format (no + prefix).
 * Vobiz expects: 91XXXXXXXXXX or just 10 digits.
 */
export function normalizePhone(phone: string): string {
  let digits = phone.replace(/[^0-9]/g, "");

  if (digits.startsWith("91") && digits.length === 12) {
    return digits; // Already 91XXXXXXXXXX
  }
  if (digits.startsWith("0") && digits.length === 11) {
    digits = digits.slice(1);
  }
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

/**
 * Format a DB month value (e.g. "2025-05-01" or ISO string) to "May 2025" for TTS.
 */
function formatMonthForTts(month: string): string {
  // Parse as UTC date (month column is always 1st of month at midnight UTC)
  const d = new Date(month);
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
}

/**
 * Build a human-readable TTS message for the voice call.
 */
export function buildReminderMessage(params: ReminderParams): string {
  const month = formatMonthForTts(params.month);
  return [
    `Hello ${params.residentName}.`,
    `This is Crown Hostel.`,
    `Your rent of ${params.amount} rupees for ${month} is overdue.`,
    `Total due with fine is ${params.totalDue} rupees.`,
    `Please pay at the earliest to avoid increasing fine.`,
    `Thank you.`,
  ].join(" ");
}

/**
 * Make an automated voice call to a resident via Vobiz.
 * Falls back to dry-run logging if credentials are not configured.
 */
export async function sendReminder(
  to: string,
  params: ReminderParams
): Promise<SendResult> {
  const authId = process.env.VOBIZ_AUTH_ID;
  const authToken = process.env.VOBIZ_AUTH_TOKEN;
  const fromNumber = process.env.VOBIZ_OUTBOUND_NUMBER;

  const message = buildReminderMessage(params);

  // Dry-run if credentials not set
  if (!authId || !authToken) {
    console.log(`[VOICE DRY-RUN] To: ${to} | TTS: ${message.substring(0, 80)}...`);
    return { success: true, messageId: `dry_${Date.now()}` };
  }

  // answer_url: Vobiz calls this when resident picks up → returns Speak XML
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

  if (!baseUrl) {
    console.log(`[VOICE DRY-RUN] No NEXT_PUBLIC_APP_URL set (localhost). To: ${to}`);
    return { success: true, messageId: `dry_local_${Date.now()}` };
  }

  const answerUrl = `${baseUrl}/api/voice/speak?message=${encodeURIComponent(message)}`;

  try {
    const response = await fetch(
      `https://api.vobiz.ai/api/v1/Account/${authId}/Call/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Auth-ID": authId,
          "X-Auth-Token": authToken,
        },
        body: JSON.stringify({
          from: fromNumber?.replace("+", "") ?? "",
          to: normalizePhone(to),
          answer_url: answerUrl,
          answer_method: "POST",
          time_limit: 60,
          ring_timeout: 30,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[VOICE ERROR] ${response.status}: ${errText}`);
      return { success: false, error: `HTTP ${response.status}: ${errText}` };
    }

    const data = await response.json();
    return {
      success: true,
      messageId: data.request_uuid ?? data.api_id ?? `vobiz_${Date.now()}`,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[VOICE ERROR] ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}

import { env } from "../config/env";
import { logger } from "../config/logger";
import { HttpError } from "../middleware/errorHandler";

export interface EmailMessage {
  subject: string;
  html: string;
  text: string;
}

const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/** Everything needed to send the summary, or null when something is missing. */
export function summaryEmailConfig(): { apiKey: string; from: string; to: string[] } | null {
  const to = (env.SUMMARY_TO_EMAIL ?? "")
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);
  if (!env.RESEND_API_KEY || !env.SUMMARY_FROM_EMAIL || to.length === 0) return null;
  if (!looksLikeEmail(env.SUMMARY_FROM_EMAIL) || !to.every(looksLikeEmail)) return null;
  return { apiKey: env.RESEND_API_KEY, from: env.SUMMARY_FROM_EMAIL, to };
}

/**
 * Sends one email through Resend (https://resend.com/docs/api-reference/emails/send-email).
 * 503 when it is not configured, 502 when Resend refuses or cannot be reached. The reason goes to the
 * log, never to the caller.
 */
export async function sendSummaryEmail(message: EmailMessage): Promise<void> {
  const config = summaryEmailConfig();
  if (!config) {
    throw new HttpError(
      503,
      "Email is not configured (RESEND_API_KEY, SUMMARY_FROM_EMAIL and SUMMARY_TO_EMAIL)",
    );
  }
  let res: Response;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: config.from,
        to: config.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    logger.error({ err }, "Could not reach the email service");
    throw new HttpError(502, "Could not reach the email service");
  }
  if (!res.ok) {
    logger.error({ status: res.status }, "The email service refused the message");
    throw new HttpError(502, "The email service refused the message");
  }
}

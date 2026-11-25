import { emailSchema } from "./validation";

export function scannerEmailConfigured() {
  return !!process.env.RESEND_API_KEY?.trim() &&
    emailSchema.safeParse(process.env.INQUIRY_EMAIL_FROM?.trim()).success;
}

export async function sendScannerEmail(
  recipient: string,
  content: { subject: string; text: string },
  idempotencyKey: string,
) {
  if (process.env.VERCEL_ENV !== "production" || !scannerEmailConfigured() ||
      !emailSchema.safeParse(recipient).success) return false;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        from: `마케팅스캐너 <${process.env.INQUIRY_EMAIL_FROM!.trim()}>`,
        to: [recipient],
        ...content,
      }),
      signal: AbortSignal.timeout(5000),
      redirect: "error",
    });
    if (!response.ok) return false;
    const body = await response.json();
    return typeof body?.id === "string";
  } catch {
    // Provider responses and message contents can contain credentials.
    return false;
  }
}

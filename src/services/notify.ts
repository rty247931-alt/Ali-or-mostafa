import { db } from "@/lib/db";
import { escapeHtml, mailConfigured, sendMail } from "@/lib/mail";

/** Best-effort customer email. Failures are logged and never block the order. */
export async function notifyCustomer(email: string | null, userId: string | null, subject: string, text: string) {
  if (!email || !mailConfigured()) return;
  if (userId) {
    const p = await db.customerProfile.findUnique({ where: { userId } });
    if ((p?.notifyPrefs as { email?: boolean } | null)?.email === false) return;
  }
  try { await sendMail(email, subject, `<div dir="rtl"><p>${escapeHtml(text)}</p></div>`); }
  catch { console.error("[mail] delivery failed"); }
}

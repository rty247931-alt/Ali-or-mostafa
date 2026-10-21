// Transactional email through Resend's REST API. Nothing is reported as "sent" unless the provider accepted it.
export const mailConfigured = () => !!(process.env.RESEND_API_KEY && process.env.MAIL_FROM);

export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function sendMail(to: string, subject: string, html: string): Promise<void> {
  if (!mailConfigured()) throw new Error("mail not configured");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to, subject, html }),
  });
  if (!r.ok) throw new Error(`mail provider ${r.status}`);
}

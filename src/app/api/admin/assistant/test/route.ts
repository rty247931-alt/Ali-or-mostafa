import { z } from "zod";
import { json, route, ApiError } from "@/lib/errors";
import { requirePerm } from "@/lib/perm";
import { buildStoreContext, generateAssistantReply } from "@/lib/assistant";

export const POST = route(async (req) => {
  await requirePerm("settings.update");
  let raw: unknown;
  try {
    const body = await req.text();
    if (!body.trim()) throw new ApiError(400, "بيانات الاختبار لم تصل. حدّث الصفحة وحاول مرة أخرى.");
    raw = JSON.parse(body);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "تعذر قراءة بيانات الاختبار. حدّث الصفحة وحاول مرة أخرى.");
  }
  const data = z.object({
    provider: z.enum(["gemini", "openai", "groq"]),
    model: z.string().trim().min(1).max(100),
  }).parse(raw);

  try {
    const context = await buildStoreContext("اختبار اتصال المساعد الذكي");
    const answer = await generateAssistantReply(
      [{ role: "user", content: "رد بكلمة واحدة: متصل" }],
      context,
      { provider: data.provider, model: data.model },
    );
    if (!answer) throw new Error("AI_EMPTY_RESPONSE");
    return json({ ok: true, provider: data.provider, model: data.model });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "AI_API_KEY_MISSING")
      throw new ApiError(400, "مفتاح المزود المختار غير موجود في Vercel Environment Variables. أضفه إلى Production ثم أعد النشر.");
    if (message === "AI_PROVIDER_UNSUPPORTED" || message === "AI_PROVIDER_NOT_CONFIGURED")
      throw new ApiError(400, "المزود المختار غير مدعوم. اختر Gemini أو OpenAI أو Groq.");
    if (message === "AI_EMPTY_RESPONSE")
      throw new ApiError(502, "المزود استجاب دون نص. جرّب موديلًا آخر.");
    throw new ApiError(502, "فشل الاتصال بالمزود. راجع صلاحية المفتاح واسم الموديل.");
  }
});

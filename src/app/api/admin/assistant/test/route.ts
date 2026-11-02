import { z } from "zod";
import { json, route, ApiError } from "@/lib/errors";
import { requirePerm } from "@/lib/perm";
import { buildStoreContext, generateAssistantReply } from "@/lib/assistant";

export const POST = route(async (req) => {
  await requirePerm("settings.update");
  const data = z.object({
    provider: z.enum(["gemini", "openai", "groq"]),
    model: z.string().trim().min(1).max(100),
  }).parse(await req.json());
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
      throw new ApiError(400, "مفتاح المزود المختار غير موجود في Vercel. أضف مفتاح المزود في Environment Variables.");
    if (message === "AI_PROVIDER_UNSUPPORTED" || message === "AI_PROVIDER_NOT_CONFIGURED")
      throw new ApiError(400, "المزود المختار غير مدعوم. اختر Gemini أو OpenAI أو Groq.");
    if (message === "AI_EMPTY_RESPONSE")
      throw new ApiError(502, "المزود استجاب دون نص. جرّب موديلًا آخر.");
    throw new ApiError(502, "فشل اختبار الاتصال. تأكد من صلاحية المفتاح واسم الموديل، ثم جرّب مرة أخرى.");
  }
});

import { json, route, ApiError } from "@/lib/errors";
import { requirePerm } from "@/lib/perm";
import { buildStoreContext, generateAssistantReply } from "@/lib/assistant";

export const POST = route(async () => {
  await requirePerm("settings.update");
  try {
    const context = await buildStoreContext("اختبار اتصال المساعد الذكي");
    const answer = await generateAssistantReply(
      [{ role: "user", content: "رد بكلمة: متصل" }],
      context,
    );
    if (!answer) throw new Error("AI_EMPTY_RESPONSE");
    return json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "AI_API_KEY_MISSING")
      throw new ApiError(400, "مفتاح المزود المختار غير موجود في Vercel. أضف GEMINI_API_KEY أو OPENAI_API_KEY حسب الاختيار.");
    if (message === "AI_PROVIDER_UNSUPPORTED")
      throw new ApiError(400, "قيمة المزود غير صحيحة. اختر gemini أو openai ثم احفظ الإعدادات.");
    throw new ApiError(502, "فشل اختبار المساعد. راجع اسم النموذج ومفتاح المزود في Vercel.");
  }
});

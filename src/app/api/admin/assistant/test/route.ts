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
    if (message === "AI_PROVIDER_NOT_CONFIGURED")
      throw new ApiError(400, "أضف مفتاح مزود الذكاء الاصطناعي في متغيرات Vercel.");
    throw new ApiError(502, "فشل اختبار المساعد. راجع اسم النموذج ومفتاح المزود في Vercel.");
  }
});

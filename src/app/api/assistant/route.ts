import { z } from "zod";
import { json, route, ApiError } from "@/lib/errors";
import { rateLimit } from "@/lib/ratelimit";
import { db } from "@/lib/db";
import { buildStoreContext, generateAssistantReply } from "@/lib/assistant";

const inputSchema = z.object({ messages: z.array(z.object({
  role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(1200),
})).min(1).max(12) });

export const POST = route(async (req) => {
  rateLimit(req, "store-assistant", 12, 60);
  const enabled = await db.storeSetting.findUnique({ where: { key: "assistant.enabled" } });
  if (enabled?.value === false) throw new ApiError(503, "المساعد الذكي متوقف مؤقتًا.");
  const input = inputSchema.parse(await req.json());
  if (input.messages[input.messages.length - 1].role !== "user") throw new ApiError(400, "أرسل سؤالك أولًا");
  const messages = input.messages.slice(-8);
  const context = await buildStoreContext(messages[messages.length - 1].content);
  try {
    const answer = await generateAssistantReply(messages, context);
    return json({ answer });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "AI_API_KEY_MISSING") throw new ApiError(503, "المساعد مفعّل، لكن مفتاح مزود الذكاء الاصطناعي غير مضاف في Vercel. أضف GEMINI_API_KEY أو OPENAI_API_KEY حسب المزود المختار.");
    if (code === "AI_PROVIDER_UNSUPPORTED") throw new ApiError(503, "مزود المساعد غير معروف. اختر gemini أو openai واحفظ الإعدادات.");
    throw new ApiError(502, "حصلت مشكلة مؤقتة أثناء الرد. جرّب مرة أخرى بعد قليل.");
  }
});

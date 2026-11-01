import { db } from "@/lib/db";
type ChatMessage = { role: "user" | "assistant"; content: string };

export async function buildStoreContext(question: string) {
  const q = question.trim().slice(0, 160);
  const [products, pages, settings] = await Promise.all([
    db.product.findMany({
      where: { status: "ACTIVE", OR: [
        { name: { contains: q, mode: "insensitive" } },
        { searchKeywords: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { brand: { name: { contains: q, mode: "insensitive" } } },
      ] },
      take: 8,
      select: { name: true, slug: true, currentPrice: true, basePrice: true, description: true, shortDesc: true, material: true, shoeType: true,
        brand: { select: { name: true } }, variants: { where: { isActive: true }, select: {
          size: { select: { label: true } }, color: { select: { name: true } },
          inventory: { select: { onHand: true, reserved: true } },
        } } },
    }),
    db.page.findMany({ where: { isPublished: true, slug: { in: ["faq", "shipping", "returns", "size-guide", "about", "terms"] } },
      select: { slug: true, title: true, content: true }, take: 8 }),
    db.storeSetting.findMany({ where: { key: { in: ["store.name", "contact.phone", "contact.email", "contact.address"] } },
      select: { key: true, value: true } }),
  ]);
  return {
    store: Object.fromEntries(settings.map((s) => [s.key, s.value])),
    products: products.map((p) => ({
      name: p.name, slug: p.slug, priceEGP: Number(p.currentPrice),
      oldPriceEGP: Number(p.basePrice) > Number(p.currentPrice) ? Number(p.basePrice) : null,
      brand: p.brand?.name ?? null, description: p.shortDesc || p.description,
      material: p.material, type: p.shoeType,
      variants: p.variants.map((v) => ({ size: v.size.label, color: v.color.name,
        available: Math.max(0, (v.inventory?.onHand ?? 0) - (v.inventory?.reserved ?? 0)) })).filter((v) => v.available > 0),
    })),
    policies: pages.map((p) => ({ title: p.title, slug: p.slug, content: p.content.slice(0, 5000) })),
  };
}

export function makeSystemPrompt(context: Awaited<ReturnType<typeof buildStoreContext>>) {
  return `أنت مساعد خدمة العملاء الذكي لمتجر خُطوة للأحذية. تحدث بالعربية المصرية المهذبة والواضحة، وافهم اللهجات والأخطاء الإملائية.
مهمتك مساعدة العميل في أسئلة المنتجات والمقاسات والألوان والأسعار والتوفر والعروض والشحن والدفع والاستبدال والاسترجاع وسياسات المتجر، وكذلك الأسئلة العامة المناسبة.
قواعد إلزامية:
- اعتبر بيانات المتجر التالية المصدر الوحيد للحقيقة في أي معلومة تخص المتجر. لا تخترع سعرًا أو مخزونًا أو مقاسًا أو سياسة أو مدة توصيل.
- إذا لم تجد المعلومة، قل ذلك بوضوح ووجّه العميل للتواصل مع خدمة العملاء.
- لا تدّعِ أنك نفذت طلبًا أو حجزت منتجًا أو ألغيت طلبًا أو غيّرت بياناته. أنت مساعد معلومات فقط.
- لا تطلب كلمة مرور أو رمز تحقق أو بيانات بطاقة بنكية. لا تكشف بيانات أي عميل أو طلب.
- إذا سأل العميل عن طلبه الشخصي، اطلب منه تسجيل الدخول ومراجعة صفحة حسابه؛ لا تطلب منه بيانات حساسة في المحادثة.
- رشّح المنتجات المتاحة فقط، واذكر السعر بالجنيه المصري والمقاسات/الألوان المتاحة عندما تكون موجودة.
- أجب بإيجاز ووضوح، واسأل سؤال متابعة واحدًا فقط عندما تحتاج معلومة لتحديد المنتج المناسب.
بيانات المتجر الحالية (قد تكون غير مكتملة):
${JSON.stringify(context)}`;
}

export async function generateAssistantReply(messages: ChatMessage[], context: Awaited<ReturnType<typeof buildStoreContext>>) {
  const provider = String(await setting("assistant.provider", "gemini"));
  const model = String(await setting("assistant.model", provider === "gemini" ? "gemini-2.0-flash" : "gpt-4o-mini"));
  const system = makeSystemPrompt(context);
  if (provider === "gemini") {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("AI_PROVIDER_NOT_CONFIGURED");
    const contents = messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents, generationConfig: { temperature: 0.4, maxOutputTokens: 700 } }),
      signal: AbortSignal.timeout(25000),
    });
    if (!response.ok) throw new Error("AI_PROVIDER_ERROR");
    const data = await response.json();
    const answer = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("").trim();
    if (!answer) throw new Error("AI_EMPTY_RESPONSE");
    return answer;
  }
  if (provider === "openai") {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("AI_PROVIDER_NOT_CONFIGURED");
    const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
    const response = await fetch(`${base}/chat/completions`, {
      method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages: [{ role: "system", content: system }, ...messages], temperature: 0.4, max_tokens: 700 }),
      signal: AbortSignal.timeout(25000),
    });
    if (!response.ok) throw new Error("AI_PROVIDER_ERROR");
    const data = await response.json();
    const answer = data?.choices?.[0]?.message?.content?.trim();
    if (!answer) throw new Error("AI_EMPTY_RESPONSE");
    return answer;
  }
  throw new Error("AI_PROVIDER_NOT_CONFIGURED");
}

async function setting(key: string, fallback: string) {
  const row = await db.storeSetting.findUnique({ where: { key } });
  return typeof row?.value === "string" && row.value ? row.value : fallback;
}

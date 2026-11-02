import { z } from "zod";
import { json, route } from "@/lib/errors";
import { requirePerm } from "@/lib/perm";
import { db } from "@/lib/db";

const providers = ["gemini", "openai", "groq"] as const;
const defaultModels = { gemini: "gemini-2.0-flash", openai: "gpt-4o-mini", groq: "llama-3.3-70b-versatile" } as const;

export const GET = route(async () => {
  await requirePerm("settings.update");
  const rows = await db.storeSetting.findMany({ where: { key: { in: ["assistant.provider", "assistant.model", "assistant.enabled"] } } });
  const values = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const rawProvider = values["assistant.provider"];
  const provider = providers.includes(rawProvider as typeof providers[number]) ? rawProvider as typeof providers[number] : "gemini";
  return json({
    provider,
    model: typeof values["assistant.model"] === "string" && values["assistant.model"] ? values["assistant.model"] : defaultModels[provider],
    enabled: values["assistant.enabled"] !== false,
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    groqConfigured: Boolean(process.env.GROQ_API_KEY),
  });
});

export const POST = route(async (req) => {
  await requirePerm("settings.update");
  const data = z.object({
    provider: z.enum(providers),
    model: z.string().trim().min(1).max(100),
    enabled: z.boolean(),
  }).parse(await req.json());
  await db.$transaction([
    db.storeSetting.upsert({ where: { key: "assistant.provider" }, create: { key: "assistant.provider", value: data.provider }, update: { value: data.provider } }),
    db.storeSetting.upsert({ where: { key: "assistant.model" }, create: { key: "assistant.model", value: data.model }, update: { value: data.model } }),
    db.storeSetting.upsert({ where: { key: "assistant.enabled" }, create: { key: "assistant.enabled", value: data.enabled }, update: { value: data.enabled } }),
  ]);
  return json({ ok: true });
});

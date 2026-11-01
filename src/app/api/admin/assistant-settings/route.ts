import { z } from "zod";
import { json, route } from "@/lib/errors";
import { requirePerm } from "@/lib/perm";
import { db } from "@/lib/db";

export const GET = route(async () => {
  await requirePerm("settings.update");
  const rows = await db.storeSetting.findMany({ where: { key: { in: ["assistant.provider", "assistant.model", "assistant.enabled"] } } });
  const values = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const provider = values["assistant.provider"] === "openai" ? "openai" : "gemini";
  return json({
    provider, model: typeof values["assistant.model"] === "string" ? values["assistant.model"] : provider === "gemini" ? "gemini-2.0-flash" : "gpt-4o-mini",
    enabled: values["assistant.enabled"] !== false,
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY), openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
  });
});

export const POST = route(async (req) => {
  await requirePerm("settings.update");
  const data = z.object({ provider: z.enum(["gemini", "openai"]), model: z.string().trim().min(1).max(100), enabled: z.boolean() }).parse(await req.json());
  await db.$transaction([
    db.storeSetting.upsert({ where: { key: "assistant.provider" }, create: { key: "assistant.provider", value: data.provider }, update: { value: data.provider } }),
    db.storeSetting.upsert({ where: { key: "assistant.model" }, create: { key: "assistant.model", value: data.model }, update: { value: data.model } }),
    db.storeSetting.upsert({ where: { key: "assistant.enabled" }, create: { key: "assistant.enabled", value: data.enabled }, update: { value: data.enabled } }),
  ]);
  return json({ ok: true });
});

import { z } from "zod";
import { db } from "@/lib/db";
import { json, route } from "@/lib/errors";
import { requirePerm } from "@/lib/perm";
import { audit } from "@/lib/audit";

const item = z.object({ title: z.string().trim().min(1).max(100), url: z.string().url().max(1000), cover: z.string().url().max(1000) });
export const GET = route(async () => {
  await requirePerm("settings.update");
  const row = await db.storeSetting.findUnique({ where: { key: "intro.videos" } });
  return json({ videos: Array.isArray(row?.value) ? row.value : [] });
});
export const PUT = route(async (req) => {
  const { userId } = await requirePerm("settings.update");
  const videos = z.array(item).max(30).parse((await req.json()).videos);
  await db.$transaction(async (tx) => {
    await tx.storeSetting.upsert({ where: { key: "intro.videos" }, update: { value: videos }, create: { key: "intro.videos", value: videos } });
    await audit(tx, userId, "settings.update", "StoreSetting", null, { key: "intro.videos", count: videos.length });
  });
  return json({ ok: true, videos });
});
import { db } from "@/lib/db";
import { ApiError, dbError, json, route } from "@/lib/errors";
import { audit } from "@/lib/audit";
import { requirePerm } from "@/lib/perm";
import { ENTITIES } from "@/lib/entities";

// One audited, permission-checked, validated handler for categories, brands, coupons, banners, pages, shipping, moderation.
export const POST = route<{ params: { entity: string } }>(async (req, { params }) => {
  const e = ENTITIES[params.entity];
  if (!e) throw new ApiError(404, "غير موجود");
  const { userId } = await requirePerm(e.perm);
  if (e.canCreate === false) throw new ApiError(405, "غير مسموح");
  const data = e.schema.parse(await req.json());
  const msg = e.check?.(data);
  if (msg) throw new ApiError(400, msg);
  try {
    const row = await (db as any)[e.model].create({ data });
    await audit(db, userId, `${params.entity}.create`, e.model, row.id, data);
    return json({ id: row.id }, 201);
  } catch (err) { throw dbError(err); }
});

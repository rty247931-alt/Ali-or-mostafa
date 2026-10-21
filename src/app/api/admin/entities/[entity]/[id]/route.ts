import { db } from "@/lib/db";
import { ApiError, dbError, json, route } from "@/lib/errors";
import { audit } from "@/lib/audit";
import { requirePerm } from "@/lib/perm";
import { ENTITIES } from "@/lib/entities";

type Ctx = { params: { entity: string; id: string } };

export const PATCH = route<Ctx>(async (req, { params }) => {
  const e = ENTITIES[params.entity];
  if (!e) throw new ApiError(404, "غير موجود");
  const { userId } = await requirePerm(e.perm);
  const data = e.schema.partial().parse(await req.json());
  const model = (db as any)[e.model];
  const before = await model.findUnique({ where: { id: params.id } });
  if (!before) throw new ApiError(404, "العنصر غير موجود");
  const msg = e.check?.({ ...before, ...data });
  if (msg) throw new ApiError(400, msg);
  try {
    await model.update({ where: { id: params.id }, data });
    await audit(db, userId, `${params.entity}.update`, e.model, params.id, { after: data });
    return json({ ok: true });
  } catch (err) { throw dbError(err); }
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const e = ENTITIES[params.entity];
  if (!e) throw new ApiError(404, "غير موجود");
  const { userId } = await requirePerm(e.perm);
  if (e.canDelete === false) throw new ApiError(405, "لا يمكن حذف هذا العنصر، عطّله بدلًا من ذلك");
  try {
    await (db as any)[e.model].delete({ where: { id: params.id } });
    await audit(db, userId, `${params.entity}.delete`, e.model, params.id);
    return json({ ok: true });
  } catch (err) { throw dbError(err); }
});

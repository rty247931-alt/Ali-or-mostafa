import { notFound, redirect } from "next/navigation";
import EntityManager from "@/components/EntityManager";
import { db } from "@/lib/db";
import { ENTITIES } from "@/lib/entities";
import { getStaff } from "@/lib/perm";

export default async function Manage({ params }: { params: { entity: string } }) {
  const e = ENTITIES[params.entity];
  if (!e) notFound();
  const staff = await getStaff();
  if (!staff?.perms.has(e.perm)) redirect("/admin");
  const rows = await (db as any)[e.model].findMany({ orderBy: e.orderBy, take: 500, ...(e.include ? { include: e.include } : {}) });
  let fields = e.fields;
  if (params.entity === "shipping-methods") {
    const zones = await db.shippingZone.findMany({ orderBy: { governorate: "asc" } });
    fields = fields.map((f) => (f.key === "zoneId" ? { ...f, options: zones.map((z) => ({ value: z.id, label: z.governorate })) } : f));
  }
  const plain = rows.map((r: Record<string, unknown>) => ({ ...JSON.parse(JSON.stringify(r)), _label: e.label(r) }));
  return (
    <>
      <h1>{e.title}</h1>
      {params.entity === "shipping-zones" && <p style={{ color: "var(--mu)" }}>أسعار ومدد الشحن تُضبط من «طرق وأسعار الشحن».</p>}
      <EntityManager entity={params.entity} fields={fields} rows={plain} canCreate={e.canCreate !== false} canDelete={e.canDelete !== false} />
    </>
  );
}

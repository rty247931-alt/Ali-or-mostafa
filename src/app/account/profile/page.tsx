import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ProfileForm from "@/components/ProfileForm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "بياناتي", robots: { index: false, follow: false } };

export default async function Profile() {
  const s = await getSession();
  if (!s) redirect("/account");
  const u = await db.user.findUnique({ where: { id: s.uid }, include: { profile: true, addresses: { orderBy: { isDefault: "desc" } } } });
  if (!u) redirect("/account");
  return (
    <div className="pg"><h1>بياناتي</h1>
      <ProfileForm fullName={u.fullName} marketingOptIn={u.profile?.marketingOptIn ?? false} notifyEmail={(u.profile?.notifyPrefs as { email?: boolean } | null)?.email !== false}
        addresses={u.addresses.map((a) => ({ id: a.id, fullName: a.fullName, phone: a.phone, governorate: a.governorate, city: a.city, addressLine: a.addressLine, isDefault: a.isDefault }))} />
    </div>
  );
}

import { redirect } from "next/navigation";
import SettingsForm from "@/components/SettingsForm";
import { db } from "@/lib/db";
import { getStaff } from "@/lib/perm";
import { paymobConfigured } from "@/lib/paymob";

export default async function SettingsPage() {
  const staff = await getStaff();
  if (!staff?.perms.has("settings.update")) redirect("/admin");
  const rows = await db.storeSetting.findMany();
  const values = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return <><h1>إعدادات المتجر</h1><SettingsForm values={values} paymobConfigured={paymobConfigured()} paymentsVerified={values["payments.online.verified"] === true} /></>;
}

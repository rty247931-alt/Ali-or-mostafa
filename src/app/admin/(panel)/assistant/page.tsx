import { redirect } from "next/navigation";
import AssistantSettingsForm from "@/components/AssistantSettingsForm";
import { getStaff } from "@/lib/perm";
export default async function AssistantSettingsPage() {
  const staff = await getStaff();
  if (!staff?.perms.has("settings.update")) redirect("/admin");
  return <><h1>المساعد الذكي</h1><p>إدارة مزوّد الذكاء الاصطناعي والموديل وسلوك المساعد داخل متجر خُطوة.</p><AssistantSettingsForm /></>;
}

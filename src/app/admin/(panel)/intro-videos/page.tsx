import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getStaff } from "@/lib/perm";
import IntroVideosAdmin from "@/components/IntroVideosAdmin";
export default async function IntroVideosPage(){
 const staff=await getStaff();if(!staff?.perms.has("settings.update"))redirect("/admin");
 const row=await db.storeSetting.findUnique({where:{key:"intro.videos"}});
 const videos=Array.isArray(row?.value)?row.value as {title:string;url:string;cover:string}[]:[];
 return <><h1>الفيديو التعريفي</h1><p>إدارة فيديوهات التعريف والعروض التي تظهر في واجهة المتجر.</p><IntroVideosAdmin initial={videos}/></>;
}
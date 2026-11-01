"use client";
import { useState } from "react";
type Video = { title: string; url: string; cover: string };
export default function IntroVideosAdmin({ initial }: { initial: Video[] }) {
 const [videos,setVideos]=useState<Video[]>(initial); const [title,setTitle]=useState(""); const [url,setUrl]=useState(""); const [cover,setCover]=useState(""); const [busy,setBusy]=useState(false); const [msg,setMsg]=useState("");
 async function save(next:Video[]) { setBusy(true);setMsg("");try{const r=await fetch("/api/admin/intro-videos",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({videos:next})});const d=await r.json();if(!r.ok)throw new Error(d.error||"تعذر الحفظ");setVideos(next);setMsg("تم حفظ فيديوهات الواجهة");}catch(e){setMsg(e instanceof Error?e.message:"حدث خطأ");}finally{setBusy(false)} }
 function add(){if(!title.trim()||!url.trim()||!cover.trim()){setMsg("أكمل العنوان ورابط الفيديو ورابط الغلاف");return;}const next=[...videos,{title:title.trim(),url:url.trim(),cover:cover.trim()}];void save(next);setTitle("");setUrl("");setCover("")}
 return <div className="box"><h2>إضافة فيديو تعريفي / ترويجي</h2><p>أضف رابط فيديو مباشر MP4 أو رابط فيديو مستضاف، ورابط صورة الغلاف. سيظهر القسم للزوار في الصفحة الرئيسية.</p>
 <label className="lbl">عنوان الفيديو</label><input className="in" value={title} onChange={e=>setTitle(e.target.value)} placeholder="مثال: تعرف على خُطوة"/>
 <label className="lbl">رابط الفيديو</label><input className="in" type="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://.../intro.mp4"/>
 <label className="lbl">رابط صورة الغلاف</label><input className="in" type="url" value={cover} onChange={e=>setCover(e.target.value)} placeholder="https://.../cover.jpg"/>
 <button className="btn" disabled={busy} onClick={add}>إضافة الفيديو</button>
 {videos.map((v,i)=><div key={v.url} style={{display:"flex",gap:12,alignItems:"center",borderTop:"1px solid var(--bd)",padding:"12px 0",marginTop:10}}><img src={v.cover} alt="" style={{width:110,height:70,objectFit:"cover",borderRadius:8}}/><div style={{flex:1}}><b>{v.title}</b><div style={{fontSize:12,overflowWrap:"anywhere"}}>{v.url}</div></div><button className="o" disabled={busy} onClick={()=>void save(videos.filter((_,n)=>n!==i))}>حذف</button></div>)}
 {msg&&<p role="status">{msg}</p>}</div>
}
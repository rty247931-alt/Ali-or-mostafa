"use client";
import { useState } from "react";
type Video = { title: string; url: string; cover: string };
export default function IntroVideosAdmin({ initial }: { initial: Video[] }) {
 const [videos,setVideos]=useState<Video[]>(initial); const [title,setTitle]=useState(""); const [url,setUrl]=useState(""); const [cover,setCover]=useState(""); const [busy,setBusy]=useState(false); const [msg,setMsg]=useState("");
 async function upload(file:File|null,kind:"video"|"cover"){if(!file)return;setBusy(true);setMsg("");try{const fd=new FormData();fd.set("file",file);fd.set("kind",kind);const r=await fetch("/api/admin/intro-videos",{method:"POST",body:fd});const d=await r.json();if(!r.ok)throw new Error(d.error||"تعذر رفع الملف");if(kind==="video")setUrl(d.url);else setCover(d.url);setMsg(kind==="video"?"تم رفع الفيديو":"تم رفع صورة الغلاف");}catch(e){setMsg(e instanceof Error?e.message:"حدث خطأ أثناء الرفع");}finally{setBusy(false)}}
 async function save(next:Video[]) { setBusy(true);setMsg("");try{const r=await fetch("/api/admin/intro-videos",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({videos:next})});const d=await r.json();if(!r.ok)throw new Error(d.error||"تعذر الحفظ");setVideos(next);setMsg("تم حفظ فيديوهات الواجهة");}catch(e){setMsg(e instanceof Error?e.message:"حدث خطأ");}finally{setBusy(false)} }
 function add(){if(!title.trim()||!url.trim()||!cover.trim()){setMsg("أكمل العنوان وارفع الفيديو وصورة الغلاف");return;}const next=[...videos,{title:title.trim(),url:url.trim(),cover:cover.trim()}];void save(next);setTitle("");setUrl("");setCover("")}
 return <div className="box"><h2>إضافة فيديو تعريفي / ترويجي</h2><p>ارفع ملف الفيديو مباشرة من جهازك، وارفع صورة الغلاف التي ستظهر للزوار.</p>
 <label className="lbl">عنوان الفيديو</label><input className="in" value={title} onChange={e=>setTitle(e.target.value)} placeholder="مثال: تعرف على خُطوة"/>
 <label className="lbl">ملف الفيديو</label><input className="in" type="file" accept="video/mp4,video/webm,video/quicktime,video/ogg" disabled={busy} onChange={e=>void upload(e.target.files?.[0]??null,"video")}/>
 {url&&<p style={{fontSize:12,overflowWrap:"anywhere"}}>تم رفع الفيديو: {url}</p>}
 <label className="lbl">صورة غلاف الفيديو</label><input className="in" type="file" accept="image/*" disabled={busy} onChange={e=>void upload(e.target.files?.[0]??null,"cover")}/>
 {cover&&<img src={cover} alt="معاينة الغلاف" style={{width:150,height:90,objectFit:"cover",borderRadius:8,marginTop:8}}/>}
 <button className="btn" disabled={busy} onClick={add}>{busy?"جارٍ الرفع...":"إضافة الفيديو"}</button>
 {videos.map((v,i)=><div key={v.url} style={{display:"flex",gap:12,alignItems:"center",borderTop:"1px solid var(--bd)",padding:"12px 0",marginTop:10}}><img src={v.cover} alt="" style={{width:110,height:70,objectFit:"cover",borderRadius:8}}/><div style={{flex:1}}><b>{v.title}</b><div style={{fontSize:12,overflowWrap:"anywhere"}}>{v.url}</div></div><button className="o" disabled={busy} onClick={()=>void save(videos.filter((_,n)=>n!==i))}>حذف</button></div>)}
 {msg&&<p role="status">{msg}</p>}</div>
}

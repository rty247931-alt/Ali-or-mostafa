"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const designs = [
 {id:"classic",name:"المتجر الكلاسيكي",desc:"متجر متوازن: بانر واضح، أقسام مرتبة، وشبكة منتجات تقليدية",colors:["#F4F1EA","#FF4A1C","#0E0E10"],layout:"grid"},
 {id:"minimal",name:"متجر مينيمال",desc:"مساحات واسعة، خطوط هادئة، بطاقات بسيطة ومنتجات أكبر",colors:["#FFFFFF","#222222","#777777"],layout:"minimal"},
 {id:"bold",name:"متجر جريء",desc:"واجهة قوية، عنوان ضخم، كروت حادة وتباين واضح",colors:["#FFF4EF","#E11D48","#191919"],layout:"bold"},
 {id:"warm",name:"متجر دافئ",desc:"زوايا ناعمة، مساحات مريحة وبطاقات مستديرة",colors:["#F7EFE3","#B65F35","#49382D"],layout:"warm"},
 {id:"luxury",name:"متجر فاخر",desc:"عرض أنيق، محاذاة وسطية، تفاصيل ذهبية وشكل راقٍ",colors:["#171717","#D4AF37","#F5F0E5"],layout:"luxury"},
 {id:"sport",name:"متجر رياضي",desc:"ستايل سريع، عناوين مائلة، شارات حادة وإيقاع نشيط",colors:["#F0F7F4","#087F5B","#102A43"],layout:"sport"},
 {id:"fresh",name:"متجر منعش",desc:"ستايل خفيف، منحنيات كبيرة وبطاقات ناعمة",colors:["#F1F8FF","#3987D7","#17324D"],layout:"fresh"},
] as const;

export default function StorefrontDesignPage(){
 const [selected,setSelected]=useState("classic");
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [message,setMessage]=useState("");
 const [marquee,setMarquee]=useState(true);
 const [marqueeText,setMarqueeText]=useState("عروض مميزة لفترة محدودة ✦ شحن سريع ✦ اختار مقاسك");
 const [hiddenText,setHiddenText]=useState("");
 useEffect(()=>{fetch("/api/admin/settings").then(async r=>{if(!r.ok)throw new Error("تعذر تحميل الإعدادات");return r.json()}).then(data=>{
  const v=data?.values||{}; if(designs.some(d=>d.id===v["storefront.design"]))setSelected(v["storefront.design"]);
  if(v.announcement&&typeof v.announcement==="object"){setMarquee(!!v.announcement.visible);setMarqueeText(v.announcement.text||marqueeText)}
  setHiddenText(typeof v["storefront.hiddenText"]==="string"?v["storefront.hiddenText"]:"");
 }).catch(e=>setMessage(e instanceof Error?e.message:"حصل خطأ")).finally(()=>setLoading(false))},[]);
 async function save(){setSaving(true);setMessage("");try{
  const r=await fetch("/api/admin/settings",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({"storefront.design":selected,announcement:{text:marqueeText,visible:marquee,url:""},"storefront.hiddenText":hiddenText})});
  const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||d.message||"لم يتم الحفظ");setMessage("اتحفظ القالب وإعدادات الشريط والنص الإضافي.");
 }catch(e){setMessage(e instanceof Error?e.message:"تعذر الحفظ")}finally{setSaving(false)}}
 return <main dir="rtl" className="pg">
  <div className="mb-5 flex items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">قوالب المتجر السبعة</h1><p className="text-sm" style={{color:"var(--mu)"}}>دي ٧ أشكال متاجر مختلفة في التنسيق، مش مجرد تغيير ألوان.</p></div><Link href="/admin" className="rounded-xl border px-4 py-2 text-sm font-semibold">رجوع للإدارة</Link></div>
  {loading?<div className="box">جارٍ تحميل الإعدادات…</div>:<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
   {designs.map(d=><button key={d.id} type="button" onClick={()=>setSelected(d.id)} aria-pressed={selected===d.id} className="box text-right transition" style={{border:selected===d.id?"3px solid var(--ac)":"2px solid var(--ln)"}}>
    <div className={`storefront storefront-${d.id} overflow-hidden rounded-xl border`} style={{background:d.colors[0],color:d.colors[2],borderColor:d.colors[2]}}>
     <div style={{background:d.colors[1],color:d.id==="luxury"?"#171717":"#fff"}} className="px-3 py-1 text-xs font-bold">{d.id==="minimal"?"تجربة هادئة":d.id==="bold"?"الجديد وصل!":d.id==="luxury"?"COLLECTION EXCLUSIVE":d.id==="sport"?"MOVE FASTER":d.id==="warm"?"اختيارات على مزاجك":d.id==="fresh"?"اكتشف الجديد":"عروض المتجر"} <span className="float-left">✦</span></div>
     <div className="p-3"><div className="text-xl font-extrabold">{d.id==="luxury"?"STEP / STUDIO":"خُطوة."}</div><div className="my-2 text-xs">{d.id==="sport"?"جاهز للخطوة الجاية؟":d.id==="luxury"?"تفاصيل تصنع الفرق":"أحذية تمشي معاك"}</div>
      <div className="grid grid-cols-3 gap-2"><div className="rounded-lg p-2 text-center text-xs" style={{background:d.colors[1],color:"#fff"}}>منتج 01</div><div className="rounded-lg p-2 text-center text-xs" style={{background:d.colors[0],border:"1px solid "+d.colors[1]}}>منتج 02</div><div className="rounded-lg p-2 text-center text-xs" style={{background:d.colors[0],border:"1px solid "+d.colors[1]}}>منتج 03</div></div></div>
    </div>
    <div className="mt-3 flex items-center justify-between gap-2"><div><h2 className="font-bold">{d.name}</h2><p className="text-sm" style={{color:"var(--mu)"}}>{d.desc}</p></div><span className="rounded-full border px-3 py-1 text-xs">{selected===d.id?"✓ مختار":"اختيار"}</span></div>
   </button>)}
  </div>}
  <section className="box mt-5 space-y-4"><h2 className="text-lg font-bold">حركة ومحتوى المتجر</h2>
   <label className="flex items-center gap-2"><input type="checkbox" checked={marquee} onChange={e=>setMarquee(e.target.checked)}/> تشغيل شريط الإعلانات المتحرك</label>
   <label className="block text-sm font-semibold">نص الشريط المتحرك<input className="mt-1 w-full rounded-xl border bg-transparent p-3" value={marqueeText} maxLength={200} onChange={e=>setMarqueeText(e.target.value)}/></label>
   <label className="block text-sm font-semibold">نص إضافي مخفي/اختياري للقالب<input className="mt-1 w-full rounded-xl border bg-transparent p-3" value={hiddenText} maxLength={200} onChange={e=>setHiddenText(e.target.value)} placeholder="اكتب النص هنا لو محتاجه يظهر داخل القالب"/></label>
   <p className="text-xs" style={{color:"var(--mu)"}}>النص الإضافي بيتحفظ كإعداد للقالب، ومش هيظهر للعميل تلقائيًا لحد ما تحدد مكان عرضه.</p>
  </section>
  <div className="mt-5 flex flex-wrap items-center gap-3"><button className="btn" onClick={save} disabled={loading||saving}>{saving?"جارٍ الحفظ…":"حفظ وتطبيق المتجر"}</button>{message&&<p role="status" className="text-sm">{message}</p>}</div>
 </main>
}

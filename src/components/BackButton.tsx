"use client";

import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();
  return <button type="button" onClick={() => router.back()} aria-label="الرجوع للصفحة السابقة" title="الرجوع للصفحة السابقة"
    className="history-back" style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,border:"1px solid var(--ln)",borderRadius:999,padding:"8px 12px",background:"var(--sf)",color:"var(--tx)",fontWeight:700,whiteSpace:"nowrap"}}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
    رجوع
  </button>;
}

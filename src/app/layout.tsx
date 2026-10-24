import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import CartCount from "@/components/CartCount";
import { headers } from "next/headers";
import { getSession } from "@/lib/session";
import { getSetting, getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const name = await getSetting("store.name", "خُطوة");
  const logo = await getSetting<string>("store.logo", "");
  return {
    title: { default: name, template: `%s – ${name}` },
    description: await getSetting("store.description", "متجر أحذية"),
    icons: logo ? { icon: logo, shortcut: logo, apple: logo } : undefined,
    metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
    openGraph: { siteName: name, locale: "ar_EG", type: "website" },
  };
}

const HEX = /^#[0-9a-fA-F]{6}$/;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [name, primary, ink, ann, storefrontDesign] = await Promise.all([
    getSetting("store.name", "خُطوة"),
    getSetting("theme.primary", "#FF4A1C"),
    getSetting("theme.ink", "#0E0E10"),
    getSetting<{ text: string; url?: string; visible: boolean; endsAt?: string } | null>("announcement", null),
    getSetting<string>("storefront.design", "classic"),
  ]);
  const [extra, session] = await Promise.all([
    getSettings(["maintenance", "contact.phone", "contact.email", "contact.address", "social.facebook", "social.instagram", "social.whatsapp", "social.tiktok", "store.logo", "store.background"]),
    getSession(),
  ]);
  const path = headers().get("x-path") ?? "/";
  const maintenance = extra.maintenance === true && !path.startsWith("/admin") && session?.kind !== "STAFF";
  const social = [["فيسبوك", "social.facebook"], ["إنستجرام", "social.instagram"], ["واتساب", "social.whatsapp"], ["تيك توك", "social.tiktok"]].filter(([, k]) => extra[k]);
  const css = `:root{${HEX.test(primary) ? `--ac:${primary};` : ""}${HEX.test(ink) ? `--acx:${ink};` : ""}}`;
  const showAnn = ann?.visible && ann.text && (!ann.endsAt || new Date(ann.endsAt) > new Date());
  return (
    <html lang="ar" dir="rtl" className={`theme-${["classic","minimal","bold","warm","luxury","sport","fresh"].includes(storefrontDesign) ? storefrontDesign : "classic"}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Changa:wght@600;800&family=Cairo:wght@500;700&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: css }} />
      </head>
      <body>
        {showAnn && <div className="ann">{ann!.url ? <Link href={ann!.url}>{ann!.text}</Link> : ann!.text}</div>}
        <header className="top">
          <div className="hb">
            <Link href="/" className="logo">{typeof extra["store.logo"] === "string" && extra["store.logo"] ? <img src={String(extra["store.logo"])} alt={name} style={{ maxHeight: 48, maxWidth: 150, objectFit: "contain", verticalAlign: "middle" }} /> : <>{name}<i>.</i></>}</Link>
            <nav>
              <Link href="/shop">المتجر</Link>
              <Link href="/shop?discount=1">العروض</Link>
              <Link href="/pages/about">من نحن</Link>
              <Link href="/contact">اتصل بنا</Link>
            </nav>
            <form action="/shop"><input type="search" name="q" placeholder="ابحث عن حذاء" aria-label="بحث" /></form>
            <Link href="/account" className="ic" aria-label="حسابي">حسابي</Link>
            <CartCount />
          </div>
        </header>
        <main style={typeof extra["store.background"] === "string" && extra["store.background"] ? { backgroundImage: `linear-gradient(#ffffffd9,#ffffffd9),url(${JSON.stringify(String(extra["store.background"]))})`, backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" } : undefined}>{maintenance ? <div className="maint"><div><h1>المتجر تحت الصيانة</h1><p>نعود قريبًا. شكرًا لصبرك.</p></div></div> : children}</main>
        <footer className="ft">
          <div className="w fg">
            <div><h4>{name}</h4><p>متجر أحذية رجالي وحريمي وأطفال.</p>
              {[extra["contact.phone"], extra["contact.email"], extra["contact.address"]].filter(Boolean).map((c) => <div key={String(c)}>{String(c)}</div>)}
              {social.length > 0 && <div className="soc">{social.map(([l, k]) => <a key={k} href={String(extra[k])} target="_blank" rel="noopener noreferrer">{l}</a>)}</div>}</div>
            <div><h4>المتجر</h4><Link href="/shop">كل المنتجات</Link><Link href="/pages/size-guide">دليل المقاسات</Link><Link href="/pages/faq">الأسئلة الشائعة</Link><Link href="/contact">اتصل بنا</Link></div>
            <div><h4>السياسات</h4><Link href="/pages/shipping">سياسة الشحن</Link><Link href="/pages/returns">الاستبدال والاسترجاع</Link><Link href="/pages/privacy">الخصوصية</Link><Link href="/pages/terms">الشروط والأحكام</Link></div>
          </div>
        </footer>
      </body>
    </html>
  );
}

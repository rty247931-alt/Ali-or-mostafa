import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await db.page.findFirst({ where: { slug: params.slug, isPublished: true } });
  return p ? { title: p.seoTitle || p.title, description: p.seoDescription || undefined, alternates: { canonical: `/pages/${p.slug}` } } : { title: "غير موجود" };
}

export default async function Page({ params }: Props) {
  const p = await db.page.findFirst({ where: { slug: params.slug, isPublished: true } });
  if (!p) notFound();
  // Rendered as plain text (never as HTML) so stored content can't inject scripts.
  return <div className="pg"><h1>{p.title}</h1><div style={{ whiteSpace: "pre-wrap" }}>{p.content}</div></div>;
}

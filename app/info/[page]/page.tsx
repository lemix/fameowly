import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { HOME_PAGE_ID, getPublicPage } from "@/lib/plugins";
import { PublicShell } from "@/components/public/public-shell";

interface InfoPageProps {
  params: Promise<{ page: string }>;
}

function findPage(id: string) {
  return id === HOME_PAGE_ID ? null : getPublicPage(id);
}

export async function generateMetadata({ params }: InfoPageProps): Promise<Metadata> {
  const page = findPage((await params).page);
  return { title: page ? `${page.title} — FaMeowly` : "FaMeowly" };
}

/** Host for plugin public pages (pricing, offer, privacy policy…). 404 in OSS builds. */
export default async function InfoPage({ params }: InfoPageProps) {
  await connection();
  const page = findPage((await params).page);
  if (!page) notFound();

  const Content = await page.load();
  return (
    <PublicShell>
      <Content />
    </PublicShell>
  );
}

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authorize } from "@/lib/auth";
import { HOME_PAGE_ID, getPublicPage } from "@/lib/plugins";
import { PublicShell } from "@/components/public/public-shell";
import { ChatApp } from "./_components/chat-app";

/** Signed-in users get the app; guests get a plugin landing or the login form */
export default async function HomePage() {
  const token = (await cookies()).get("session")?.value;
  if (await authorize(token)) return <ChatApp />;

  const landing = getPublicPage(HOME_PAGE_ID);
  if (!landing) redirect("/login");

  const Landing = await landing.load();
  return (
    <PublicShell>
      <Landing />
    </PublicShell>
  );
}

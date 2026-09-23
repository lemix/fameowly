import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getChat } from "@/lib/chat-store";
import { readModelsConfig } from "@/lib/models.server";
import { PrintDocument } from "./_components/print-document";
import { PrintTrigger } from "./_components/print-trigger";

interface PrintPageProps {
  params: Promise<{ chatId: string }>;
  searchParams: Promise<{ autoprint?: string }>;
}

/** Browsers offer the tab title as the default PDF file name */
export async function generateMetadata({ params }: PrintPageProps): Promise<Metadata> {
  const session = await getSession();
  const { chatId } = await params;
  const chat = session ? getChat(session.userId, chatId) : null;
  return { title: chat?.title || "Экспорт чата" };
}

export default async function PrintChatPage({ params, searchParams }: PrintPageProps) {
  const session = await getSession();
  if (!session) notFound();

  const { chatId } = await params;
  const chat = getChat(session.userId, chatId);
  if (!chat) notFound();

  const { autoprint } = await searchParams;
  const modelName =
    readModelsConfig().chatModels.find((m) => m.id === chat.modelId)?.name ?? chat.modelId;

  return (
    <>
      {/* Runs while the document parses, so a dark-theme user never gets a dark flash before the light print view */}
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.classList.remove("dark")`,
        }}
      />
      <PrintTrigger auto={autoprint === "1"} />
      <PrintDocument
        chat={chat}
        modelName={modelName}
        exportedAt={new Date().toISOString()}
      />
    </>
  );
}

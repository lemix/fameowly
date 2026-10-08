import { Fragment } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getCompanyDetails, ogrnLabel } from "@/lib/company-details";

export const metadata: Metadata = { title: "Реквизиты — FaMeowly" };

/** Public page with the operator's legal details, required by payment providers. */
export default async function RequisitesPage() {
  await connection();
  const details = getCompanyDetails();
  if (!details) notFound();

  const rows: Array<[string, string | undefined]> = [
    ["Наименование", details.name],
    ["ИНН", details.inn],
    ["КПП", details.kpp],
    [ogrnLabel(details.ogrn), details.ogrn],
    ["Адрес", details.address],
    ["Email", details.email],
    ["Телефон", details.phone],
  ];

  return (
    <main className="h-[100dvh] overflow-y-auto bg-gradient-to-br from-th-page via-th-panel to-th-page">
      <div className="flex min-h-full items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg rounded-2xl border border-th-border bg-th-panel/80 p-8 shadow-2xl backdrop-blur-sm">
          <h1 className="mb-6 text-xl font-semibold text-th-fg">Реквизиты</h1>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
            {rows
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <Fragment key={label}>
                  <dt className="text-th-fg-m">{label}</dt>
                  <dd className="break-words text-th-fg">{value}</dd>
                </Fragment>
              ))}
          </dl>
          <Link
            href="/"
            className="mt-8 inline-block text-sm text-th-accent hover:underline"
          >
            На главную
          </Link>
        </div>
      </div>
    </main>
  );
}

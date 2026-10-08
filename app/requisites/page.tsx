import { Fragment } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getCompanyDetails, ogrnLabel } from "@/lib/company-details";
import { PublicShell } from "@/components/public/public-shell";

export const metadata: Metadata = { title: "Контакты и реквизиты — FaMeowly" };

/** Public page with the operator's contacts and legal details, required by payment providers. */
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
    <PublicShell>
      <div className="mx-auto w-full max-w-lg rounded-2xl border border-th-border bg-th-panel/80 p-8">
        <h1 className="mb-6 text-xl font-semibold text-th-fg">Контакты и реквизиты</h1>
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
      </div>
    </PublicShell>
  );
}

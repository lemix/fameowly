import Link from "next/link";
import { connection } from "next/server";
import { getCompanyDetails } from "@/lib/company-details";
import { LoginForm } from "./_components/login-form";

export default async function LoginPage() {
  await connection();
  const hasRequisites = getCompanyDetails() !== null;

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-th-page via-th-panel to-th-page px-4">
      <div className="w-full max-w-sm rounded-2xl border border-th-border bg-th-panel/80 p-8 shadow-2xl backdrop-blur-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/fameowly.svg" alt="Fameowly" width={343} height={71} className="hidden h-10 w-auto select-none dark:block" draggable={false} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/fameowly-light.svg" alt="Fameowly" width={343} height={71} className="block h-10 w-auto select-none dark:hidden" draggable={false} />
          <p className="text-sm text-th-fg-m">Войдите в свой аккаунт</p>
        </div>

        <LoginForm />

        {hasRequisites && (
          <Link
            href="/requisites"
            className="mt-6 block text-center text-xs text-th-fg-m hover:text-th-fg hover:underline"
          >
            Реквизиты
          </Link>
        )}
      </div>
    </div>
  );
}

import type { ReactNode } from "react";
import Link from "next/link";
import { BrandLogo } from "./brand-logo";
import { PublicFooter } from "./public-footer";

/** Frame of every page open to guests: logo, sign-in link, content, legal footer */
export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="h-[100dvh] overflow-y-auto bg-th-page text-th-fg">
      <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-4 safe-area-top">
        <header className="flex items-center justify-between gap-4 py-5">
          <Link href="/" aria-label="На главную">
            <BrandLogo className="h-8" />
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-th-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-th-accent-muted"
          >
            Войти
          </Link>
        </header>
        <main className="flex-1 py-6">{children}</main>
        <PublicFooter />
      </div>
    </div>
  );
}

import { connection } from "next/server";
import { BrandLogo } from "@/components/public/brand-logo";
import { PublicFooter } from "@/components/public/public-footer";
import { LoginForm } from "./_components/login-form";

export default async function LoginPage() {
  await connection();

  return (
    <div className="h-[100dvh] overflow-y-auto bg-gradient-to-br from-th-page via-th-panel to-th-page">
      <div className="flex min-h-full flex-col items-center justify-center px-4 pt-8">
        <div className="w-full max-w-sm rounded-2xl border border-th-border bg-th-panel/80 p-8 shadow-2xl backdrop-blur-sm">
          <div className="mb-6 flex flex-col items-center gap-3">
            <BrandLogo />
            <p className="text-sm text-th-fg-m">Войдите в свой аккаунт</p>
          </div>

          <LoginForm />
        </div>

        <PublicFooter />
      </div>
    </div>
  );
}

import Link from "next/link";
import { getCompanyDetails, ogrnLabel } from "@/lib/company-details";
import { getPublicPageLinks } from "@/lib/plugins";

/** Links to legal pages and the operator line; renders nothing when there is neither */
export function PublicFooter() {
  const company = getCompanyDetails();
  const links = getPublicPageLinks();
  if (company) links.push({ href: "/requisites", label: "Контакты и реквизиты" });
  if (links.length === 0) return null;

  return (
    <footer className="mt-10 w-full space-y-4 border-t border-th-border py-6 text-xs text-th-fg-m">
      <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="hover:text-th-fg hover:underline">
            {link.label}
          </Link>
        ))}
      </nav>
      <p className="text-center text-th-fg-f">
        © {new Date().getFullYear()} FaMeowly
        {company && ` · ${company.name}, ИНН ${company.inn}, ${ogrnLabel(company.ogrn)} ${company.ogrn}`}
      </p>
    </footer>
  );
}

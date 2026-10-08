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
    <footer className="flex flex-col items-center gap-2 py-6 text-center text-xs text-th-fg-m">
      <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="hover:text-th-fg hover:underline">
            {link.label}
          </Link>
        ))}
      </nav>
      {company && (
        <p className="text-th-fg-f">
          {company.name}, ИНН {company.inn}, {ogrnLabel(company.ogrn)} {company.ogrn}
        </p>
      )}
    </footer>
  );
}

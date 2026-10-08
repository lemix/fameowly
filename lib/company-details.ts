export interface CompanyDetails {
  name: string;
  inn: string;
  ogrn: string;
  kpp?: string;
  address?: string;
  email?: string;
  phone?: string;
}

function readEnv(key: string): string | undefined {
  return process.env[key]?.trim() || undefined;
}

/** Call at request time: in Docker the env arrives only at run time, never at build. */
export function getCompanyDetails(): CompanyDetails | null {
  const name = readEnv("COMPANY_NAME");
  const inn = readEnv("COMPANY_INN");
  const ogrn = readEnv("COMPANY_OGRN");
  if (!name || !inn || !ogrn) return null;

  return {
    name,
    inn,
    ogrn,
    kpp: readEnv("COMPANY_KPP"),
    address: readEnv("COMPANY_ADDRESS"),
    email: readEnv("COMPANY_EMAIL"),
    phone: readEnv("COMPANY_PHONE"),
  };
}

/** A sole proprietor's registration number (ОГРНИП) has 15 digits, a company's (ОГРН) 13. */
export function ogrnLabel(ogrn: string): string {
  return ogrn.length === 15 ? "ОГРНИП" : "ОГРН";
}

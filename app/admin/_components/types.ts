export interface UserRecord {
  id: string;
  name: string;
  role: "admin" | "user";
}

export const ROLE_LABELS: Record<UserRecord["role"], string> = {
  admin: "Админ",
  user: "Пользователь",
};

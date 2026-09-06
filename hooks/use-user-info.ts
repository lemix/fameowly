"use client";

import { useState, useEffect } from "react";
import type { UserInfo } from "@/lib/types";

/** Fetch current user info (id, name, role) from /api/auth/me */
export function useUserInfo() {
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          return;
        }
        // Role or password changed — the token is valid but superseded
        if (res.status === 401 && window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      } catch {
        // silent — user stays null
      }
    }
    load();
  }, []);

  return user;
}

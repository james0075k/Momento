"use client";

import type { User } from "@momento/shared";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { adminRequest } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";

interface AdminSession {
  user: User;
  isAdmin: boolean;
  logout: () => Promise<void>;
}

const SessionContext = createContext<AdminSession | null>(null);

export function useAdmin(): AdminSession {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useAdmin must be used inside the admin area");
  return session;
}

/**
 * Asks the API who is signed in. The API is what really protects the data on every call; this only
 * decides what the screen shows, and sends people without a session to the login page.
 */
export function AdminGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    adminRequest<User>("/auth/me")
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 401) {
          router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
        } else {
          setFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
    // Once per visit to the admin area; screens react to their own 401s.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (failed) {
    return (
      <p role="alert" className="text-brand p-8">
        Could not reach the shop. Check that the API is running, then reload.
      </p>
    );
  }
  if (!user) {
    return (
      <p role="status" className="text-muted-foreground p-8">
        Checking your session
      </p>
    );
  }

  const logout = async () => {
    try {
      await adminRequest("/auth/logout", { method: "POST", body: {} });
    } finally {
      router.replace("/admin/login");
    }
  };

  return (
    <SessionContext.Provider value={{ user, isAdmin: user.role === "admin", logout }}>
      {children}
    </SessionContext.Provider>
  );
}

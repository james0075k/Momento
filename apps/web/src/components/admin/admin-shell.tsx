"use client";

import { LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { isActive, navFor } from "./nav";
import { useAdmin } from "./session";

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { isAdmin } = useAdmin();
  const pathname = usePathname();
  return (
    <ul className="space-y-1">
      {navFor(isAdmin).map((item) => {
        const active = isActive(item, pathname);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "focus-visible:outline-accent flex min-h-11 items-center rounded-md px-3 font-medium focus-visible:outline-2",
                active ? "bg-surface text-ink" : "text-surface/85 hover:bg-surface/10",
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function UserBox() {
  const { user, logout } = useAdmin();
  return (
    <div className="border-surface/15 border-t pt-4">
      <p className="truncate font-medium">{user.name}</p>
      <p className="text-surface/70 truncate text-sm">
        {user.email} · {user.role}
      </p>
      <button
        type="button"
        onClick={() => void logout()}
        className="text-surface/85 focus-visible:outline-accent mt-2 inline-flex min-h-11 items-center gap-2 hover:underline focus-visible:outline-2"
      >
        <LogOut aria-hidden className="size-4" />
        Sign out
      </button>
    </div>
  );
}

/**
 * The admin frame: a fixed sidebar on wide screens, and a menu button with a slide-in drawer on phones
 * (the panel has to work on a phone). Escape closes the drawer and returns focus to the button.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      menuButton.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="bg-paper text-ink print:bg-surface min-h-screen md:grid md:grid-cols-[16rem_1fr] print:block">
      <aside className="bg-ink text-surface hidden flex-col justify-between p-4 md:sticky md:top-0 md:flex md:h-screen print:hidden">
        <div>
          <p className="font-heading mb-6 px-3 text-2xl font-semibold">Momento admin</p>
          <nav aria-label="Admin">
            <NavList />
          </nav>
        </div>
        <UserBox />
      </aside>

      <div className="min-w-0">
        <div className="bg-ink text-surface flex h-14 items-center justify-between px-4 md:hidden print:hidden">
          <p className="font-heading text-xl font-semibold">Momento admin</p>
          <button
            ref={menuButton}
            type="button"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="focus-visible:outline-accent inline-flex size-11 items-center justify-center focus-visible:outline-2"
          >
            <Menu aria-hidden className="size-6" />
          </button>
        </div>
        <main className="mx-auto max-w-6xl p-4 md:p-8 print:max-w-none print:p-0">{children}</main>
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Admin menu"
          className="bg-ink text-surface fixed inset-0 z-50 flex flex-col justify-between p-4 md:hidden"
        >
          <div>
            <div className="mb-4 flex items-center justify-between">
              <p className="font-heading px-3 text-2xl font-semibold">Momento admin</p>
              <button
                ref={closeButton}
                type="button"
                aria-label="Close menu"
                onClick={() => {
                  setOpen(false);
                  menuButton.current?.focus();
                }}
                className="focus-visible:outline-accent inline-flex size-11 items-center justify-center focus-visible:outline-2"
              >
                <X aria-hidden className="size-6" />
              </button>
            </div>
            <nav aria-label="Admin menu">
              <NavList onNavigate={() => setOpen(false)} />
            </nav>
          </div>
          <UserBox />
        </div>
      )}
    </div>
  );
}

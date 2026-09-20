"use client";

import type { User } from "@momento/shared";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { buttonVariants } from "@/components/ui/button";
import { adminRequest } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import { safeNext } from "@/lib/safe-next";
import { cn } from "@/lib/utils";
import { Field, inputClass } from "./ui";

export function LoginForm({ next }: { next: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(undefined);
    try {
      await adminRequest<User>("/auth/login", {
        body: {
          email: String(data.get("email") ?? ""),
          password: String(data.get("password") ?? ""),
        },
      });
      router.replace(safeNext(next));
    } catch (err) {
      setBusy(false);
      setError(err instanceof ApiError ? err.message : "Could not sign in. Please try again.");
    }
  };

  return (
    <form onSubmit={onSubmit} className="bg-surface w-full max-w-sm space-y-4 rounded-2xl p-6">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <Field id="email" label="Email">
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className={inputClass}
        />
      </Field>
      <Field id="password" label="Password">
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </Field>
      {error && (
        <p role="alert" className="bg-brand/10 text-brand rounded-xl px-4 py-3 font-medium">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className={cn(buttonVariants({ size: "lg" }), "h-12 w-full")}
      >
        {busy ? "Signing in" : "Sign in"}
      </button>
    </form>
  );
}

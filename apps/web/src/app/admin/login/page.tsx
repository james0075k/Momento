import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  return (
    <main className="bg-paper text-ink flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <p className="font-heading text-3xl font-semibold">Momento admin</p>
      <LoginForm next={Array.isArray(next) ? (next[0] ?? null) : (next ?? null)} />
    </main>
  );
}

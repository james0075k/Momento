import type { Metadata } from "next";
import { TrackForm } from "@/components/cart/track-form";
import { PageShell } from "@/components/layout/page-shell";

export const metadata: Metadata = {
  title: "Track your order",
  description: "Check where your Momento order is with your order code and phone number.",
  robots: { index: false },
};

export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = (await searchParams).code;
  const code = typeof raw === "string" && /^[A-Za-z0-9-]{1,24}$/.test(raw) ? raw : "";
  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Track your order</h1>
        <p className="text-muted-foreground mb-8 mt-3 max-w-xl text-lg">
          Enter the order code from your confirmation and the phone number you ordered with.
        </p>
        <TrackForm initialCode={code} />
      </div>
    </PageShell>
  );
}

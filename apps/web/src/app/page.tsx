import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-start justify-center gap-6 px-4">
      <h1 className="text-ink text-4xl font-semibold md:text-6xl">Momento</h1>
      <p className="text-muted-foreground text-lg">
        Photo books, frames and prints, made in Nepal. Coming soon.
      </p>
      <Button size="lg">Order on WhatsApp</Button>
    </main>
  );
}

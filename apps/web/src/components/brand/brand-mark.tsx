import { cn } from "@/lib/utils";

/**
 * The Momento mark: a crimson square tilted 6 degrees with a paper "photo" in it. It is the only logo
 * shape in the site. The tab icons and link-preview images draw the same geometry in `lib/brand-image.tsx`;
 * change both together.
 */
function Square({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("bg-brand relative block size-5 -rotate-6", className)}>
      <span className="bg-paper absolute inset-x-[15%] top-[15%] h-1/2" />
    </span>
  );
}

/**
 * `backed` sits the mark on a paper tile, so it stays clear on the dark indigo admin menu
 * (crimson straight onto indigo has weak contrast).
 */
export function BrandMark({ className, backed = false }: { className?: string; backed?: boolean }) {
  if (!backed) return <Square className={className} />;
  return (
    <span
      aria-hidden
      className="bg-paper inline-flex size-9 items-center justify-center rounded-lg"
    >
      <Square className={className} />
    </span>
  );
}

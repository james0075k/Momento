import { cn } from "@/lib/utils";

interface StarsProps {
  rating: number;
  className?: string;
  /** "light" outlines the stars in white for dark backgrounds. */
  tone?: "ink" | "light";
}

const STAR = "M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z";

/** Marigold stars with an ink outline so they hold contrast on paper and white. */
export function Stars({ rating, className, tone = "ink" }: StarsProps) {
  const rounded = Math.round(rating);
  return (
    <span
      role="img"
      aria-label={`${rating.toFixed(1)} out of 5 stars`}
      className={cn("inline-flex gap-0.5", className)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} viewBox="0 0 24 24" aria-hidden className="size-5">
          <path
            d={STAR}
            strokeWidth="1.4"
            strokeLinejoin="round"
            className={cn(
              tone === "light" ? "stroke-surface" : "stroke-ink",
              n <= rounded ? "fill-accent" : "fill-transparent",
            )}
          />
        </svg>
      ))}
    </span>
  );
}

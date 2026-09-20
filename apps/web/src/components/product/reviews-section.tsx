import type { Review } from "@momento/shared";
import { BadgeCheck } from "lucide-react";
import Image from "next/image";
import { Stars } from "@/components/home/stars";
import type { ReviewSummary } from "@/lib/catalog";
import { ReviewForm } from "./review-form";

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

function Summary({ summary }: { summary: ReviewSummary }) {
  const max = Math.max(...summary.distribution, 1);
  return (
    <div className="bg-surface rounded-2xl p-5 md:p-7">
      <p className="text-5xl font-semibold tabular-nums">{summary.average.toFixed(1)}</p>
      <Stars rating={summary.average} className="mt-2" />
      <p className="text-muted-foreground mt-2 text-sm">
        {summary.count} {summary.count === 1 ? "review" : "reviews"}
      </p>
      <ul className="mt-5 space-y-2" aria-label="Reviews by rating">
        {[5, 4, 3, 2, 1].map((stars) => {
          const total = summary.distribution[stars - 1] ?? 0;
          return (
            <li key={stars} className="flex items-center gap-3 text-sm">
              <span className="w-14 shrink-0">{stars} stars</span>
              <span className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                <span
                  className="bg-accent block h-full origin-left rounded-full"
                  style={{ width: `${(total / max) * 100}%` }}
                />
              </span>
              <span className="w-6 text-right tabular-nums">{total}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface ReviewsSectionProps {
  productId: string;
  reviews: Review[];
  summary: ReviewSummary | null;
}

export function ReviewsSection({ productId, reviews, summary }: ReviewsSectionProps) {
  return (
    <section id="reviews" aria-labelledby="reviews-title" className="scroll-mt-24">
      <h2 id="reviews-title" className="mb-6 text-2xl font-semibold md:text-3xl">
        Customer reviews
      </h2>
      <div className="grid gap-8 lg:grid-cols-[20rem_1fr] lg:gap-12">
        <div className="space-y-6">
          {summary ? (
            <Summary summary={summary} />
          ) : (
            <p className="text-muted-foreground">
              No reviews yet. Be the first to tell others what you think.
            </p>
          )}
        </div>
        <div className="space-y-8">
          {reviews.length > 0 && (
            <ul className="space-y-6">
              {reviews.map((review) => (
                <li key={review.id} className="border-ink/10 border-b pb-6">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Stars rating={review.rating} />
                    {review.verified && (
                      <span className="text-success inline-flex items-center gap-1 text-sm font-medium">
                        <BadgeCheck aria-hidden className="size-4" />
                        Verified purchase
                      </span>
                    )}
                  </div>
                  {review.title && <h3 className="mt-2 text-lg font-semibold">{review.title}</h3>}
                  <p className="mt-2 max-w-prose whitespace-pre-line">{review.comment}</p>
                  {review.photos[0] && (
                    <div className="relative mt-3 size-28 overflow-hidden rounded-xl">
                      <Image
                        src={review.photos[0]}
                        alt={`Photo from ${review.name}`}
                        fill
                        sizes="7rem"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <p className="text-muted-foreground mt-3 text-sm">
                    {review.name}, {date(review.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <ReviewForm productId={productId} />
        </div>
      </div>
    </section>
  );
}

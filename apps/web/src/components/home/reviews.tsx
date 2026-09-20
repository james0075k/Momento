import type { ReviewData, ReviewStats } from "@/lib/home";
import { ReviewsCarousel } from "./reviews-carousel";
import { Section, SectionHeading } from "./section";
import { StatList, type Stat } from "./stats";

interface ReviewsProps {
  id: string;
  title: string;
  subtitle?: string;
  reviews: ReviewData[];
  stats: ReviewStats | null;
  productTotal: number;
}

/** Reviews plus the numbers that back them up: review count, range, delivery time. */
export function Reviews({ id, title, subtitle, reviews, stats, productTotal }: ReviewsProps) {
  if (reviews.length === 0) return null;
  const headingId = `reviews-${id}`;

  const numbers: Stat[] = [];
  if (stats) numbers.push({ value: stats.count, label: "customer reviews from across Nepal" });
  if (productTotal > 0) {
    numbers.push({
      value: productTotal,
      label: "ways to keep a photo: books, frames, magnets, canvas",
    });
  }
  numbers.push({
    value: 3,
    suffix: " days",
    label: "or less to reach Kathmandu Valley once printed",
  });

  return (
    <Section id="reviews" tone="ink" labelledBy={headingId}>
      <SectionHeading id={headingId} title={title} subtitle={subtitle} onInk />
      <StatList items={numbers} />
      <ReviewsCarousel reviews={reviews} />
    </Section>
  );
}

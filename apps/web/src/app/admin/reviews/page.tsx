import type { Metadata } from "next";
import { ReviewsAdmin } from "@/components/admin/reviews-admin";

export const metadata: Metadata = { title: "Reviews" };

export default function ReviewsPage() {
  return <ReviewsAdmin />;
}

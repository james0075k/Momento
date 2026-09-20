import type { Metadata } from "next";
import { GiftCardsAdmin } from "@/components/admin/gift-cards-admin";

export const metadata: Metadata = { title: "Gift cards" };

export default function GiftCardsPage() {
  return <GiftCardsAdmin />;
}

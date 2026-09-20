import type { Metadata } from "next";
import { HomeSectionsAdmin } from "@/components/admin/home-sections-admin";

export const metadata: Metadata = { title: "Home page" };

export default function HomeSectionsPage() {
  return <HomeSectionsAdmin />;
}

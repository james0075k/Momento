import type { Metadata } from "next";
import { CategoriesAdmin } from "@/components/admin/categories-admin";

export const metadata: Metadata = { title: "Categories" };

export default function CategoriesPage() {
  return <CategoriesAdmin />;
}

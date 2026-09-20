import type { Metadata } from "next";
import { ProductsAdmin } from "@/components/admin/products-admin";

export const metadata: Metadata = { title: "Products" };

export default function ProductsPage() {
  return <ProductsAdmin />;
}

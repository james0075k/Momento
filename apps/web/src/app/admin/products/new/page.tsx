import type { Metadata } from "next";
import { ProductEditor } from "@/components/admin/product-editor";

export const metadata: Metadata = { title: "New product" };

export default function NewProductPage() {
  return <ProductEditor />;
}

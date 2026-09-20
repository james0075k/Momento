import type { Metadata } from "next";
import { ProductEditor } from "@/components/admin/product-editor";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  return <ProductEditor id={(await params).id} />;
}

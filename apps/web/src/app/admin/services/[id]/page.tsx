import type { Metadata } from "next";
import { ServiceEditor } from "@/components/admin/service-editor";

export const metadata: Metadata = { title: "Edit service" };

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  return <ServiceEditor id={(await params).id} />;
}

import type { Metadata } from "next";
import { CustomersAdmin } from "@/components/admin/customers-admin";

export const metadata: Metadata = { title: "Customers" };

export default function CustomersPage() {
  return <CustomersAdmin />;
}

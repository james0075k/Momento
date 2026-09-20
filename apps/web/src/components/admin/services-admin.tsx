"use client";

import type { Service } from "@momento/shared";
import Link from "next/link";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import { adminList, adminRequest } from "@/lib/admin-api";
import { formatNpr, plainText } from "@/lib/format";
import { useAdminData } from "@/lib/use-admin-data";
import { cn } from "@/lib/utils";
import { ConfirmButton } from "./controls";
import { DataTable } from "./data-table";
import { useAdmin } from "./session";
import { Badge, ErrorNote, Loading, PageHeader } from "./ui";

export function ServicesAdmin() {
  const { isAdmin } = useAdmin();
  const { data, error, loading, reload } = useAdminData(() =>
    adminList<Service>("/services?limit=100&includeInactive=true"),
  );

  const remove = async (service: Service) => {
    await adminRequest(`/services/${service.id}`, { method: "DELETE" });
    toast.success(`Deleted ${service.title}`);
    reload();
  };

  return (
    <>
      <PageHeader
        title="Services"
        description="Photo restoration, album design help, printing jobs and more."
        actions={
          <Link href="/admin/services/new" className={cn(buttonVariants())}>
            New service
          </Link>
        }
      />
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && (
        <DataTable
          caption="Services"
          rows={data.data}
          rowKey={(service) => service.id}
          empty="No services yet. Add your first one."
          columns={[
            {
              header: "Service",
              cell: (service) => (
                <span>
                  <span className="block font-medium">{service.title}</span>
                  <span className="text-muted-foreground line-clamp-1 text-sm">
                    {plainText(service.description, 80)}
                  </span>
                </span>
              ),
            },
            {
              header: "Price",
              cell: (service) =>
                service.startingPrice === undefined
                  ? "By quote"
                  : `From ${formatNpr(service.startingPrice)}`,
            },
            { header: "Position", cell: (service) => service.order },
            {
              header: "Status",
              cell: (service) => (
                <span className="flex flex-wrap gap-1">
                  <Badge tone={service.isActive ? "success" : "neutral"}>
                    {service.isActive ? "Visible" : "Hidden"}
                  </Badge>
                  {service.showOnHome && <Badge tone="warning">On home page</Badge>}
                </span>
              ),
            },
            {
              header: "Actions",
              cell: (service) => (
                <span className="flex flex-wrap items-center gap-1">
                  <Link
                    href={`/admin/services/${service.id}`}
                    aria-label={`Edit ${service.title}`}
                    className="text-brand focus-visible:outline-ring inline-flex min-h-11 items-center px-2 font-medium underline underline-offset-4 focus-visible:outline-2"
                  >
                    Edit
                  </Link>
                  {isAdmin && (
                    <ConfirmButton
                      label="Delete"
                      title={`Delete ${service.title}?`}
                      message="It disappears from the shop and the home page."
                      confirmLabel="Delete service"
                      onConfirm={() => remove(service)}
                    />
                  )}
                </span>
              ),
            },
          ]}
        />
      )}
    </>
  );
}

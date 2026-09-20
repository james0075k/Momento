"use client";

import type { OrderStatus } from "@momento/shared";
import { adminRequest } from "@/lib/admin-api";
import type { Dashboard } from "@/lib/admin-types";
import { formatNpr } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/order-status";
import { useAdminData } from "@/lib/use-admin-data";
import { useAdmin } from "./session";
import { Card, ErrorNote, Kpi, Loading, PageHeader } from "./ui";

/** Bar colours per status, from the brand tokens only. */
const BAR: Record<OrderStatus, string> = {
  pending_payment: "bg-accent",
  paid: "bg-success",
  printing: "bg-ink/50",
  shipped: "bg-ink",
  delivered: "bg-success",
  cancelled: "bg-brand",
};

const monthName = (month: string) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

function StatusBars({ counts }: { counts: Record<string, number> }) {
  const statuses = Object.keys(STATUS_LABEL) as OrderStatus[];
  const max = Math.max(1, ...statuses.map((status) => counts[status] ?? 0));
  return (
    <ul className="space-y-3">
      {statuses.map((status) => {
        const count = counts[status] ?? 0;
        return (
          <li key={status}>
            <div className="mb-1 flex justify-between text-sm">
              <span>{STATUS_LABEL[status]}</span>
              <span className="font-medium tabular-nums">{count}</span>
            </div>
            <div className="bg-muted h-3 overflow-hidden rounded-full" aria-hidden>
              <div
                className={`${BAR[status]} h-full rounded-full`}
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function DashboardView() {
  const { user } = useAdmin();
  const { data, error, loading, reload } = useAdminData(() =>
    adminRequest<Dashboard>("/stats/dashboard"),
  );

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Welcome, ${user.name}. Days and months are Nepal time.`}
      />
      {loading && !data && <Loading />}
      {error && <ErrorNote message={error} onRetry={reload} />}
      {data && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Kpi
              label="Orders today"
              value={String(data.today.orders)}
              note={`${data.today.paidOrders} paid today`}
            />
            <Kpi
              label="Revenue today"
              value={formatNpr(data.today.revenue)}
              note="Payments confirmed today"
            />
            <Kpi
              label="Waiting for payment"
              value={String(data.pendingPayments.count)}
              note={`${formatNpr(data.pendingPayments.amount)} owed`}
            />
            <Kpi
              label={`Orders in ${monthName(data.month.month)}`}
              value={String(data.month.orders)}
              note={`${data.month.paidOrders} paid`}
            />
            <Kpi
              label="Revenue this month"
              value={formatNpr(data.month.revenue)}
              note="Payments confirmed this month"
            />
            <Kpi label="Reviews to approve" value={String(data.reviewsAwaitingApproval.count)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Orders this month by status">
              <StatusBars counts={data.ordersByStatus} />
            </Card>
            <Card title="Top products this month">
              {data.topProducts.length === 0 ? (
                <p className="text-muted-foreground">No orders yet this month.</p>
              ) : (
                <ol className="space-y-2">
                  {data.topProducts.map((product, index) => (
                    <li key={product.title} className="flex justify-between gap-3">
                      <span>
                        {index + 1}. {product.title}
                      </span>
                      <span className="font-medium tabular-nums">{product.quantity} sold</span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>

          <Card title="Latest reviews awaiting approval">
            {data.reviewsAwaitingApproval.latest.length === 0 ? (
              <p className="text-muted-foreground">Nothing waiting.</p>
            ) : (
              <ul className="divide-ink/10 divide-y">
                {data.reviewsAwaitingApproval.latest.map((review) => (
                  <li key={review.id} className="py-3">
                    <p className="font-medium">
                      {review.name}{" "}
                      <span className="text-muted-foreground">· {review.rating} of 5</span>
                    </p>
                    <p className="text-muted-foreground">{review.comment}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </>
  );
}

"use client";

import type { Order } from "@momento/shared";
import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { adminRequest } from "@/lib/admin-api";
import { formatNepalDateTime, formatNpr } from "@/lib/format";
import { AREA_LABEL, PAYMENT_LABEL, STATUS_LABEL } from "@/lib/order-status";
import { useAdminData } from "@/lib/use-admin-data";
import { ErrorNote, Loading } from "./ui";

/**
 * A packing and delivery slip, laid out for a sheet of paper. The admin frame hides itself when
 * printing (see admin-shell), so what comes out of the printer is only this page.
 */
export function OrderSlip({ id }: { id: string }) {
  const {
    data: order,
    error,
    loading,
    reload,
  } = useAdminData(() => adminRequest<Order>(`/orders/${id}`), [id]);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link
          href={`/admin/orders/${id}`}
          className="text-brand focus-visible:outline-ring inline-flex min-h-11 items-center gap-1 font-medium underline underline-offset-4 focus-visible:outline-2"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Back to the order
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          disabled={!order}
          className="bg-brand text-surface focus-visible:outline-ring inline-flex min-h-11 items-center gap-2 rounded-md px-5 font-medium focus-visible:outline-2 disabled:opacity-50"
        >
          <Printer aria-hidden className="size-4" />
          Print
        </button>
      </div>
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !order && <Loading />}
      {order && <Slip order={order} />}
    </>
  );
}

function Slip({ order }: { order: Order }) {
  const pieces = order.items.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <article
      aria-label={`Slip for order ${order.code}`}
      className="bg-surface text-ink mx-auto max-w-3xl rounded-2xl p-6 print:max-w-none print:rounded-none print:p-0"
    >
      <header className="border-ink flex flex-wrap items-start justify-between gap-2 border-b-2 pb-3">
        <div>
          <p className="font-heading text-2xl font-semibold">Momento</p>
          <p className="text-muted-foreground text-sm">Order slip</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums">{order.code}</p>
          <p className="text-sm">{formatNepalDateTime(order.createdAt)}</p>
        </div>
      </header>

      <section aria-labelledby="slip-ship" className="mt-4">
        <h2 id="slip-ship" className="text-sm font-semibold uppercase tracking-wide">
          Deliver to
        </h2>
        <p className="mt-1 text-xl font-semibold">{order.customer.name}</p>
        <p className="text-lg tabular-nums">{order.customer.phone}</p>
        <p className="whitespace-pre-line">{order.customer.address}</p>
        <p className="font-medium">{AREA_LABEL[order.customer.area]}</p>
      </section>

      <section aria-labelledby="slip-items" className="mt-5">
        <h2 id="slip-items" className="text-sm font-semibold uppercase tracking-wide">
          Items ({pieces})
        </h2>
        <table className="mt-1 w-full text-left">
          <thead>
            <tr className="border-ink border-b">
              <th scope="col" className="w-12 py-1 pr-2">
                Qty
              </th>
              <th scope="col" className="py-1">
                Item
              </th>
              <th scope="col" className="py-1 text-right">
                Price
              </th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, index) => (
              <tr
                key={`${item.productId}-${item.variantId ?? index}`}
                className="border-ink/20 break-inside-avoid border-b align-top"
              >
                <td className="py-2 pr-2 text-lg font-semibold tabular-nums">{item.quantity}</td>
                <td className="py-2">
                  <span className="font-medium">{item.title}</span>
                  {item.variantLabel && <span className="block text-sm">{item.variantLabel}</span>}
                </td>
                <td className="py-2 text-right tabular-nums">{formatNpr(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="ml-auto mt-2 max-w-xs">
          <SlipRow label="Items" value={formatNpr(order.subtotal)} />
          <SlipRow label="Delivery" value={formatNpr(order.deliveryFee)} />
          {order.discount > 0 && <SlipRow label="Coupon" value={`-${formatNpr(order.discount)}`} />}
          {order.referralDiscount > 0 && (
            <SlipRow label="Referral" value={`-${formatNpr(order.referralDiscount)}`} />
          )}
          {order.giftCardApplied > 0 && (
            <SlipRow label="Gift card" value={`-${formatNpr(order.giftCardApplied)}`} />
          )}
          <div className="border-ink mt-1 flex justify-between border-t-2 pt-1 text-lg font-bold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatNpr(order.total)}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-5 grid gap-1 text-sm sm:grid-cols-2">
        <p>
          <span className="font-semibold">Payment: </span>
          {PAYMENT_LABEL[order.paymentMethod]}, {STATUS_LABEL[order.status].toLowerCase()}
        </p>
        <p>
          <span className="font-semibold">Photos uploaded: </span>
          {order.photos.length}
        </p>
      </section>

      {order.note && (
        <section className="border-ink mt-4 break-inside-avoid rounded-lg border p-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide">Customer note</h2>
          <p className="whitespace-pre-line">{order.note}</p>
        </section>
      )}
      {order.adminNotes && (
        <section className="border-ink mt-3 break-inside-avoid rounded-lg border p-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide">Team notes</h2>
          <p className="whitespace-pre-line">{order.adminNotes}</p>
        </section>
      )}
    </article>
  );
}

function SlipRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

"use client";

import type { Order, OrderStatus } from "@momento/shared";
import { ArrowLeft, MessageCircle, Printer, Share2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { useFeature } from "@/components/features/features-provider";
import { adminRequest } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import { formatNepalDateTime, formatNpr } from "@/lib/format";
import {
  ACTION_LABEL,
  AREA_LABEL,
  nextStatuses,
  PAYMENT_LABEL,
  STATUS_LABEL,
  STATUS_TONE,
} from "@/lib/order-status";
import { useAdminData } from "@/lib/use-admin-data";
import { ConfirmButton } from "./controls";
import { Badge, Card, ErrorNote, Loading, PageHeader } from "./ui";

const buttonClass =
  "focus-visible:outline-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 font-medium focus-visible:outline-2 disabled:opacity-50";
const primary = `${buttonClass} bg-brand text-surface`;
const secondary = `${buttonClass} border-input bg-surface border`;

const failure = (error: unknown): string =>
  error instanceof ApiError ? error.message : "Something went wrong. Please try again.";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

function Items({ order }: { order: Order }) {
  return (
    <Card title="Items">
      <ul className="divide-ink/10 divide-y">
        {order.items.map((item, index) => (
          <li key={`${item.productId}-${item.variantId ?? index}`} className="flex gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{item.title}</p>
              {item.variantLabel && (
                <p className="text-muted-foreground text-sm">{item.variantLabel}</p>
              )}
              <p className="text-muted-foreground text-sm">
                {item.quantity} x {formatNpr(item.unitPrice)}
              </p>
            </div>
            <p className="font-medium tabular-nums">{formatNpr(item.lineTotal)}</p>
          </li>
        ))}
      </ul>
      <dl className="border-ink/15 mt-2 border-t pt-2">
        <Row label="Items">{formatNpr(order.subtotal)}</Row>
        <Row label="Delivery">{formatNpr(order.deliveryFee)}</Row>
        {order.discount > 0 && (
          <Row label={order.couponCode ? `Coupon ${order.couponCode}` : "Discount"}>
            -{formatNpr(order.discount)}
          </Row>
        )}
        {order.referralDiscount > 0 && (
          <Row label="Referral">-{formatNpr(order.referralDiscount)}</Row>
        )}
        {order.giftCardApplied > 0 && (
          <Row label={order.giftCardCode ? `Gift card ${order.giftCardCode}` : "Gift card"}>
            -{formatNpr(order.giftCardApplied)}
          </Row>
        )}
        <div className="border-ink/15 mt-1 flex justify-between border-t pt-2 text-lg font-semibold">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatNpr(order.total)}</dd>
        </div>
      </dl>
    </Card>
  );
}

function CustomerCard({ order }: { order: Order }) {
  const { customer } = order;
  return (
    <Card title="Customer">
      <p className="font-medium">{customer.name}</p>
      <p>
        <a
          href={`tel:${customer.phone}`}
          className="text-brand focus-visible:outline-ring inline-flex min-h-11 items-center underline underline-offset-4 focus-visible:outline-2"
        >
          {customer.phone}
        </a>
      </p>
      <p className="whitespace-pre-line">{customer.address}</p>
      <p className="text-muted-foreground text-sm">{AREA_LABEL[customer.area]}</p>
      <p className="text-muted-foreground mt-2 text-sm">
        Pays by {PAYMENT_LABEL[order.paymentMethod]}
      </p>
      {order.note && (
        <div className="bg-paper mt-3 rounded-xl p-3">
          <p className="text-sm font-semibold">Note from the customer</p>
          <p className="whitespace-pre-line">{order.note}</p>
        </div>
      )}
      {order.photos.length > 0 && (
        <div className="mt-3">
          <p className="text-sm font-semibold">
            Photos ({order.photos.length}), opens in a new tab
          </p>
          <ul className="mt-1 flex flex-wrap gap-x-4">
            {order.photos.map((url, index) => (
              <li key={url}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand focus-visible:outline-ring inline-flex min-h-11 items-center underline underline-offset-4 focus-visible:outline-2"
                >
                  Photo {index + 1}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function StatusCard({ order, onChanged }: { order: Order; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const options = nextStatuses(order.status);

  const change = async (status: OrderStatus) => {
    if (busy) return;
    setBusy(true);
    try {
      await adminRequest(`/orders/${order.id}/status`, { method: "PATCH", body: { status } });
      toast.success(`Order is now: ${STATUS_LABEL[status]}`);
      onChanged();
    } catch (error) {
      toast.error(failure(error));
      // Someone else may have changed it first, so show what is true now.
      if (error instanceof ApiError && error.status === 409) onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Status">
      <p className="mb-3">
        <Badge tone={STATUS_TONE[order.status]}>{STATUS_LABEL[order.status]}</Badge>
      </p>
      {options.length === 0 ? (
        <p className="text-muted-foreground">This order is finished. No more changes.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {options
            .filter((status) => status !== "cancelled")
            .map((status) => (
              <button
                key={status}
                type="button"
                disabled={busy}
                onClick={() => void change(status)}
                className={primary}
              >
                {ACTION_LABEL[status]}
              </button>
            ))}
          {options.includes("cancelled") && (
            <ConfirmButton
              label={ACTION_LABEL.cancelled}
              title={`Cancel ${order.code}?`}
              message="The order stops here and cannot be reopened. Any coupon, referral or gift card money it used goes back."
              confirmLabel="Cancel order"
              onConfirm={() => change("cancelled")}
            />
          )}
        </div>
      )}
      <h3 className="mt-5 font-semibold">History</h3>
      <ol className="mt-1 space-y-1">
        {order.statusHistory.map((entry) => (
          <li key={`${entry.status}-${entry.at}`} className="flex justify-between gap-3 text-sm">
            <span>{STATUS_LABEL[entry.status]}</span>
            <span className="text-muted-foreground">{formatNepalDateTime(entry.at)}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function NotesCard({ order, onChanged }: { order: Order; onChanged: () => void }) {
  const saved = order.adminNotes ?? "";
  const [text, setText] = useState(saved);
  const [busy, setBusy] = useState(false);

  // Follow the server (after a save or someone else's change), but never overwrite what is being typed.
  useEffect(() => {
    setText(saved);
  }, [saved]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await adminRequest(`/orders/${order.id}/notes`, {
        method: "PATCH",
        body: { adminNotes: text },
      });
      toast.success("Notes saved");
      onChanged();
    } catch (error) {
      toast.error(failure(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Notes for the team">
      <form onSubmit={onSubmit} noValidate>
        <label htmlFor="order-notes" className="sr-only">
          Notes for the team
        </label>
        <textarea
          id="order-notes"
          value={text}
          maxLength={1000}
          rows={4}
          onChange={(event) => setText(event.target.value)}
          className="border-input bg-surface focus-visible:outline-ring w-full rounded-md border p-3 focus-visible:outline-2"
        />
        <p className="text-muted-foreground mt-1 text-sm">
          Only the team sees these. {text.length} of 1000.
        </p>
        <button
          type="submit"
          disabled={busy || text.trim() === saved}
          className={`${primary} mt-3`}
        >
          {busy ? "Saving" : "Save notes"}
        </button>
      </form>
    </Card>
  );
}

interface WhatsappLinks {
  customerReply: string | undefined;
  teamShare: string;
}

/** The links follow the status (the message text depends on it), so they load again when it changes. */
function WhatsappCard({ order }: { order: Order }) {
  const links = useAdminData(
    () => adminRequest<WhatsappLinks>(`/orders/${order.id}/whatsapp`),
    [order.id, order.status],
  );
  return (
    <Card title="WhatsApp">
      {links.error && <ErrorNote message={links.error} onRetry={links.reload} />}
      {links.loading && !links.data && <Loading />}
      {links.data && (
        <div className="flex flex-wrap gap-2">
          {links.data.customerReply && (
            <a
              href={links.data.customerReply}
              target="_blank"
              rel="noopener noreferrer"
              className={primary}
            >
              <MessageCircle aria-hidden className="size-4" />
              Reply to customer
            </a>
          )}
          <a
            href={links.data.teamShare}
            target="_blank"
            rel="noopener noreferrer"
            className={secondary}
          >
            <Share2 aria-hidden className="size-4" />
            Share with team
          </a>
        </div>
      )}
      <p className="text-muted-foreground mt-2 text-sm">
        The reply is written for the current status. Sharing leaves out the phone number and the
        address.
      </p>
    </Card>
  );
}

export function OrderDetail({ id }: { id: string }) {
  const alerts = useFeature("orderAlerts");
  const {
    data: order,
    error,
    loading,
    reload,
  } = useAdminData(() => adminRequest<Order>(`/orders/${id}`), [id]);

  return (
    <>
      <Link
        href="/admin/orders"
        className="text-brand focus-visible:outline-ring mb-3 inline-flex min-h-11 items-center gap-1 font-medium underline underline-offset-4 focus-visible:outline-2"
      >
        <ArrowLeft aria-hidden className="size-4" />
        All orders
      </Link>
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !order && <Loading />}
      {order && (
        <>
          <PageHeader
            title={order.code}
            description={`Placed ${formatNepalDateTime(order.createdAt)}`}
            actions={
              <Link href={`/admin/orders/${order.id}/print`} className={secondary}>
                <Printer aria-hidden className="size-4" />
                Print slip
              </Link>
            }
          />
          <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
            <div className="space-y-4">
              <Items order={order} />
              <CustomerCard order={order} />
            </div>
            <div className="space-y-4">
              <StatusCard order={order} onChanged={reload} />
              {alerts && <WhatsappCard order={order} />}
              <NotesCard order={order} onChanged={reload} />
            </div>
          </div>
        </>
      )}
    </>
  );
}

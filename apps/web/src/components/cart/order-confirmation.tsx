"use client";

import type { Order, Settings } from "@momento/shared";
import { CircleCheck, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { formatNpr } from "@/lib/format";
import { buildOrderMessage } from "@/lib/order-message";
import { readLastOrder } from "@/lib/order-session";
import { cn } from "@/lib/utils";
import { whatsappLink } from "@/lib/whatsapp";
import { CopyButton } from "./copy-button";
import { OrderTotals } from "./order-totals";

type Payment = Settings["paymentDetails"];

function PaymentOptions({ payment }: { payment: Payment }) {
  const hasBank = payment.bankName || payment.bankAccountNumber;
  const rows: Array<{ title: string; lines: Array<[string, string, boolean]> }> = [];
  if (payment.esewaId) rows.push({ title: "eSewa", lines: [["eSewa ID", payment.esewaId, true]] });
  if (payment.khaltiId)
    rows.push({ title: "Khalti", lines: [["Khalti ID", payment.khaltiId, true]] });
  if (hasBank) {
    rows.push({
      title: "Bank transfer",
      lines: [
        ...(payment.bankName
          ? ([["Bank", payment.bankName, false]] as Array<[string, string, boolean]>)
          : []),
        ...(payment.bankAccountName
          ? ([["Account name", payment.bankAccountName, false]] as Array<[string, string, boolean]>)
          : []),
        ...(payment.bankAccountNumber
          ? ([["Account number", payment.bankAccountNumber, true]] as Array<
              [string, string, boolean]
            >)
          : []),
      ],
    });
  }

  if (rows.length === 0 && !payment.qrImage) {
    return (
      <p className="text-muted-foreground">
        We will send the payment details when you message us on WhatsApp.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.title} className="bg-surface rounded-2xl p-4">
          <h3 className="font-semibold">{row.title}</h3>
          <dl className="mt-2 space-y-1">
            {row.lines.map(([label, value, copy]) => (
              <div key={label} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <dt className="text-muted-foreground text-sm">{label}</dt>
                  <dd className="break-words font-medium">{value}</dd>
                </div>
                {copy && <CopyButton value={value} label={label} />}
              </div>
            ))}
          </dl>
        </div>
      ))}
      {payment.qrImage && (
        <div className="bg-surface rounded-2xl p-4">
          <h3 className="font-semibold">Scan to pay</h3>
          {/* eslint-disable-next-line @next/next/no-img-element -- the shop can host its QR anywhere */}
          <img
            src={payment.qrImage}
            alt="Payment QR code"
            width={240}
            height={240}
            className="mt-2 size-48 max-w-full rounded-lg object-contain"
          />
        </div>
      )}
    </div>
  );
}

/**
 * Shown right after ordering. It reads the order from this tab's session, so a bare order code in
 * a link shows nothing: anyone else is sent to the tracking form, which also asks for the phone.
 */
export function OrderConfirmation({ code, settings }: { code: string; settings: Settings }) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);

  useEffect(() => {
    const found = readLastOrder(code);
    setOrder(found);
    if (!found) router.replace(`/track?code=${encodeURIComponent(code)}`);
  }, [code, router]);

  if (!order) {
    return (
      <div role="status" className="bg-muted h-64 animate-pulse rounded-2xl">
        <span className="sr-only">Loading your order</span>
      </div>
    );
  }

  const message = buildOrderMessage({
    code: order.code,
    customerName: order.customer.name,
    items: order.items,
    total: order.total,
    photoCount: order.photos?.length,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <header className="text-center">
        <CircleCheck aria-hidden className="text-success mx-auto size-12" />
        <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Order placed</h1>
        <p className="text-muted-foreground mt-2">
          One more step: send it to us on WhatsApp so we can start.
        </p>
        <div className="bg-surface mx-auto mt-5 inline-flex items-center gap-2 rounded-2xl px-5 py-3">
          <div className="text-left">
            <p className="text-muted-foreground text-sm">Your order code</p>
            <p className="text-2xl font-semibold tabular-nums">{order.code}</p>
          </div>
          <CopyButton value={order.code} label="order code" />
        </div>
      </header>

      <section aria-labelledby="whatsapp-title" className="bg-surface rounded-2xl p-5 md:p-7">
        <h2 id="whatsapp-title" className="text-2xl font-semibold">
          1. Send your order on WhatsApp
        </h2>
        <p className="text-muted-foreground mt-2">
          The message already has your order code, items and total. Just press send.
        </p>
        <a
          href={whatsappLink(settings.shopWhatsappNumber, message)}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ size: "lg" }), "mt-4 h-12 w-full sm:w-auto")}
        >
          <MessageCircle aria-hidden />
          Send order on WhatsApp
        </a>
      </section>

      <section aria-labelledby="pay-title">
        <h2 id="pay-title" className="text-2xl font-semibold">
          2. Pay {formatNpr(order.total)}
        </h2>
        <p className="text-muted-foreground mb-4 mt-2">
          Pay by any of these and put the order code in the remarks. We mark your order paid once we
          see it.
        </p>
        <PaymentOptions payment={settings.paymentDetails} />
      </section>

      <section aria-labelledby="summary-title" className="bg-surface rounded-2xl p-5 md:p-7">
        <h2 id="summary-title" className="text-2xl font-semibold">
          3. We print and deliver
        </h2>
        <p className="text-muted-foreground mt-2">
          Delivering to {order.customer.name}, {order.customer.address}.
        </p>
        <ul className="mt-4 space-y-2">
          {order.items.map((item, index) => (
            <li key={`${item.productId}-${index}`} className="flex justify-between gap-4">
              <span>
                {item.quantity} x {item.title}
                {item.variantLabel && (
                  <span className="text-muted-foreground block text-sm">{item.variantLabel}</span>
                )}
              </span>
              <span className="tabular-nums">{formatNpr(item.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <OrderTotals
          className="border-ink/10 mt-4 border-t pt-4"
          subtotal={order.subtotal}
          discount={order.discount}
          referralDiscount={order.referralDiscount}
          giftCardApplied={order.giftCardApplied}
          deliveryFee={order.deliveryFee}
          total={order.total}
          couponCode={order.couponCode}
        />
        {order.photos && order.photos.length > 0 && (
          <p className="text-muted-foreground mt-4 text-sm">
            {order.photos.length} {order.photos.length === 1 ? "photo" : "photos"} uploaded.
          </p>
        )}
      </section>

      <p className="text-center">
        <Link
          href={`/track?code=${encodeURIComponent(order.code)}`}
          className="text-brand focus-visible:outline-ring inline-flex min-h-11 items-center font-medium underline underline-offset-4 focus-visible:outline-2"
        >
          Track this order later
        </Link>
      </p>
    </div>
  );
}

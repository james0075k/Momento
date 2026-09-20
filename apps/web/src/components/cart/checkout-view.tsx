"use client";

import {
  createOrderInputSchema,
  type DeliveryArea,
  type Order,
  type Settings,
} from "@momento/shared";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { PhotoScene } from "@/components/home/scenes";
import {
  GiftCardField,
  ReferralField,
  type AppliedGiftCard,
  type AppliedReferral,
} from "@/components/promotions/checkout-promos";
import { buttonVariants } from "@/components/ui/button";
import { ApiError, apiRequest } from "@/lib/api";
import { lineKey } from "@/lib/cart";
import { formatNpr } from "@/lib/format";
import { saveLastOrder } from "@/lib/order-session";
import { takePendingCoupon } from "@/lib/pending-coupon";
import { deliveryFeeFor, estimateWithPromos } from "@/lib/pricing";
import { useLiveCart } from "@/lib/use-live-cart";
import { cn } from "@/lib/utils";
import { OrderTotals } from "./order-totals";
import { PhotoDropzone, usePhotoUploads } from "./photo-dropzone";

const field =
  "border-input bg-surface focus-visible:outline-ring min-h-11 w-full rounded-md border px-4 text-base focus-visible:outline-2 focus-visible:outline-offset-2";
const invalid = "border-brand";

type FieldName = "name" | "phone" | "address" | "area";
type Errors = Partial<Record<FieldName | "form", string>>;

const MESSAGES: Record<FieldName, string> = {
  name: "Enter your name.",
  phone: "Enter a phone number we can reach, like 98XXXXXXXX.",
  address: "Enter your delivery address (at least 3 characters).",
  area: "Choose where we should deliver.",
};

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block font-medium">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-muted-foreground mt-1 text-sm">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-brand mt-1 text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

export function CheckoutView({ settings }: { settings: Settings }) {
  const router = useRouter();
  const cart = useLiveCart();
  const uploads = usePhotoUploads();
  const [area, setArea] = useState<DeliveryArea>("inside_valley");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState(false);

  const [couponText, setCouponText] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState<string>();
  const [couponBusy, setCouponBusy] = useState(false);
  // Phase 8: shown only while their flags are on (the fields render nothing otherwise).
  const [referral, setReferral] = useState<AppliedReferral | null>(null);
  const [giftCard, setGiftCard] = useState<AppliedGiftCard | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const subtotal = cart.availableSubtotal;
  const totals = estimateWithPromos(subtotal, area, settings.deliveryFees, {
    couponDiscount: coupon?.discount ?? 0,
    referralDiscount: referral?.discount ?? 0,
    giftCardBalance: giftCard?.balance ?? 0,
  });

  // A changed subtotal can change the discount (percent coupons, minimum order), so ask again.
  useEffect(() => {
    if (!coupon || subtotal === 0) return;
    apiRequest<{ code: string; discount: number }>("/coupons/validate", {
      body: { code: coupon.code, subtotal },
    })
      .then((next) =>
        setCoupon((current) => (current?.discount === next.discount ? current : next)),
      )
      .catch((error: unknown) => {
        setCoupon(null);
        setCouponError(error instanceof ApiError ? error.message : "Coupon could not be checked.");
      });
    // Only the subtotal matters here; the coupon object changing must not retrigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  const applyCoupon = async (override?: string) => {
    const code = (override ?? couponText).trim();
    if (!code) return;
    setCouponBusy(true);
    setCouponError(undefined);
    try {
      setCoupon(
        await apiRequest<{ code: string; discount: number }>("/coupons/validate", {
          body: { code, subtotal },
        }),
      );
    } catch (error) {
      setCoupon(null);
      setCouponError(error instanceof ApiError ? error.message : "Coupon could not be checked.");
    } finally {
      setCouponBusy(false);
    }
  };

  // A coupon from the festival banner or a ?coupon=CODE link is applied once the cart has items.
  useEffect(() => {
    if (!cart.hydrated || subtotal === 0 || coupon) return;
    const code = takePendingCoupon(new URLSearchParams(window.location.search).get("coupon"));
    if (!code) return;
    setCouponText(code);
    void applyCoupon(code);
    // Waits for the cart to be ready and priced; the pending code is read once, so this cannot repeat.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.hydrated, subtotal]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const text = (key: string) => String(data.get(key) ?? "").trim();

    if (uploads.uploading) {
      setErrors({ form: "Your photos are still uploading. Wait a moment, then place the order." });
      return;
    }
    if (uploads.failed) {
      setErrors({ form: "Some photos did not upload. Remove them or add them again." });
      return;
    }

    const parsed = createOrderInputSchema.safeParse({
      customer: { name: text("name"), phone: text("phone"), address: text("address"), area },
      items: cart.availableLines.map((line) => ({
        productId: line.productId,
        variantId: line.variantId,
        quantity: line.quantity,
      })),
      couponCode: coupon?.code,
      referralCode: referral?.code,
      giftCardCode: giftCard?.code,
      paymentMethod: "whatsapp",
      note: text("note") || undefined,
      photos: uploads.urls,
    });
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] === "customer" ? (issue.path[1] as FieldName) : undefined;
        if (key && key in MESSAGES) next[key] ??= MESSAGES[key];
        else next.form ??= "Something in your order needs fixing. Check your cart and try again.";
      }
      setErrors(next);
      formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      return;
    }

    setErrors({});
    setBusy(true);
    try {
      const order = await apiRequest<Order>("/orders", { body: parsed.data });
      setPlaced(true);
      saveLastOrder(order);
      cart.clear();
      router.push(`/order/${order.code}`);
    } catch (error) {
      setBusy(false);
      const message = error instanceof ApiError ? error.message : "Could not place your order.";
      if (error instanceof ApiError && /coupon/i.test(message)) {
        setCoupon(null);
        setCouponError(message);
        setErrors({
          form: "Your coupon could not be used. Remove it or try another, then place the order again.",
        });
      } else if (error instanceof ApiError && /referral/i.test(message)) {
        setReferral(null);
        setErrors({
          form: `${message}. Remove the referral code or try another, then place the order again.`,
        });
      } else if (error instanceof ApiError && /gift card/i.test(message)) {
        setGiftCard(null);
        setErrors({ form: `${message}. Check your gift card, then place the order again.` });
      } else {
        setErrors({ form: message });
      }
    }
  };

  if (!cart.hydrated || placed) {
    return (
      <div role="status" className="bg-muted h-64 animate-pulse rounded-2xl">
        <span className="sr-only">
          {placed ? "Order placed, opening your confirmation" : "Loading"}
        </span>
      </div>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <div className="border-ink/15 rounded-2xl border border-dashed px-6 py-16 text-center">
        <h2 className="text-2xl font-semibold">Your cart is empty</h2>
        <p className="text-muted-foreground mt-2">
          Add something to your cart before checking out.
        </p>
        <Link href="/shop" className={cn(buttonVariants({ size: "lg" }), "mt-6 h-12")}>
          Browse the shop
        </Link>
      </div>
    );
  }

  if (cart.unavailable.length > 0) {
    return (
      <div role="alert" className="bg-surface rounded-2xl p-6">
        <h2 className="text-2xl font-semibold">Some items are no longer available</h2>
        <p className="text-muted-foreground mt-2">Remove them in your cart, then come back.</p>
        <Link href="/cart" className={cn(buttonVariants({ size: "lg" }), "mt-5 h-12")}>
          Go to cart
        </Link>
      </div>
    );
  }

  const fees = settings.deliveryFees;
  const areaOptions: Array<{ value: DeliveryArea; label: string }> = [
    { value: "inside_valley", label: "Inside Kathmandu Valley" },
    { value: "outside_valley", label: "Outside the Valley" },
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_24rem] lg:gap-12">
      <form id="checkout-form" ref={formRef} onSubmit={onSubmit} noValidate className="space-y-8">
        <section aria-labelledby="who-title" className="space-y-4">
          <h2 id="who-title" className="text-2xl font-semibold">
            Your details
          </h2>
          <Field id="name" label="Full name" error={errors.name}>
            <input
              id="name"
              name="name"
              autoComplete="name"
              maxLength={100}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "name-error" : undefined}
              className={cn(field, errors.name && invalid)}
            />
          </Field>
          <Field
            id="phone"
            label="Phone number"
            error={errors.phone}
            hint="We use it to confirm your order and to look it up later."
          >
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={20}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? "phone-error" : undefined}
              className={cn(field, errors.phone && invalid)}
            />
          </Field>
        </section>

        <section aria-labelledby="where-title" className="space-y-4">
          <h2 id="where-title" className="text-2xl font-semibold">
            Delivery
          </h2>
          <fieldset>
            <legend className="mb-2 font-medium">Where should we deliver?</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {areaOptions.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "focus-within:outline-ring flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 focus-within:outline-2 focus-within:outline-offset-2",
                    area === option.value ? "border-brand bg-surface" : "border-ink/15 bg-surface",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="area"
                      value={option.value}
                      checked={area === option.value}
                      onChange={() => setArea(option.value)}
                      className="accent-brand size-5"
                    />
                    {option.label}
                  </span>
                  <span className="text-muted-foreground text-sm tabular-nums">
                    {deliveryFeeFor(option.value, subtotal, fees) === 0
                      ? "Free"
                      : formatNpr(deliveryFeeFor(option.value, subtotal, fees))}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <Field
            id="address"
            label="Delivery address"
            error={errors.address}
            hint="Area, street and a landmark help our rider."
          >
            <textarea
              id="address"
              name="address"
              rows={3}
              maxLength={300}
              autoComplete="street-address"
              aria-invalid={Boolean(errors.address)}
              aria-describedby={errors.address ? "address-error" : undefined}
              className={cn(field, "py-3", errors.address && invalid)}
            />
          </Field>
          <Field id="note" label="Delivery note (optional)">
            <textarea
              id="note"
              name="note"
              rows={2}
              maxLength={500}
              placeholder="For example: call before delivery"
              className={cn(field, "py-3")}
            />
          </Field>
        </section>

        <section aria-labelledby="coupon-title" className="space-y-3">
          <h2 id="coupon-title" className="text-2xl font-semibold">
            Coupon
          </h2>
          {coupon ? (
            <div className="bg-surface border-success/40 flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
              <span>
                <strong>{coupon.code}</strong> takes off {formatNpr(coupon.discount)}
              </span>
              <button
                type="button"
                onClick={() => {
                  setCoupon(null);
                  setCouponText("");
                }}
                className="text-brand focus-visible:outline-ring min-h-11 px-2 font-medium underline underline-offset-4 focus-visible:outline-2"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <label htmlFor="coupon" className="sr-only">
                Coupon code
              </label>
              <input
                id="coupon"
                value={couponText}
                onChange={(event) => setCouponText(event.target.value.toUpperCase())}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void applyCoupon();
                  }
                }}
                maxLength={32}
                autoCapitalize="characters"
                placeholder="Coupon code"
                className={cn(field, "flex-1")}
              />
              <button
                type="button"
                onClick={() => void applyCoupon()}
                disabled={couponBusy || !couponText.trim()}
                className="border-input bg-surface hover:bg-muted focus-visible:outline-ring inline-flex min-h-11 items-center rounded-md border px-5 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
              >
                {couponBusy ? "Checking" : "Apply"}
              </button>
            </div>
          )}
          {couponError && (
            <p role="alert" className="text-brand text-sm">
              {couponError}
            </p>
          )}
        </section>

        <ReferralField
          applied={referral}
          onApply={setReferral}
          onRemove={() => setReferral(null)}
        />
        <GiftCardField
          applied={giftCard}
          onApply={setGiftCard}
          onRemove={() => setGiftCard(null)}
        />

        <section aria-labelledby="photos-title" className="space-y-3">
          <h2 id="photos-title" className="text-2xl font-semibold">
            Photos to print (optional)
          </h2>
          <p className="text-muted-foreground">
            Adding photos for a print order? Upload them here. You can also send them on WhatsApp
            after ordering.
          </p>
          <PhotoDropzone uploads={uploads} />
        </section>

        <p className="text-muted-foreground">
          You pay after ordering. We send the order to you on WhatsApp, then you pay by eSewa,
          Khalti or bank transfer.
        </p>

        {errors.form && (
          <p role="alert" className="bg-brand/10 text-brand rounded-xl px-4 py-3 font-medium">
            {errors.form}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className={cn(buttonVariants({ size: "lg" }), "hidden h-12 w-full lg:inline-flex")}
        >
          {busy ? "Placing your order" : `Place order, ${formatNpr(totals.total)}`}
        </button>
      </form>

      <aside
        aria-label="Order summary"
        className="lg:sticky lg:top-[calc(6rem+var(--banner-h,0px))] lg:self-start"
      >
        <div className="bg-surface rounded-2xl p-5">
          <h2 className="text-xl font-semibold">Your order</h2>
          <ul className="mt-4 space-y-3">
            {cart.lines.map((line) => (
              <li key={lineKey(line)} className="flex gap-3">
                <div className="bg-tint relative size-14 shrink-0 overflow-hidden rounded-lg">
                  {line.image ? (
                    <Image src={line.image} alt="" fill sizes="3.5rem" className="object-cover" />
                  ) : (
                    <PhotoScene scene="himal" />
                  )}
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium leading-snug">{line.title}</p>
                  {line.variantLabel && (
                    <p className="text-muted-foreground">{line.variantLabel}</p>
                  )}
                  <p className="text-muted-foreground tabular-nums">
                    {line.quantity} x {formatNpr(line.unitPrice)}
                  </p>
                </div>
                <p className="text-sm font-medium tabular-nums">
                  {formatNpr(line.unitPrice * line.quantity)}
                </p>
              </li>
            ))}
          </ul>
          <OrderTotals
            className="border-ink/10 mt-4 border-t pt-4"
            subtotal={totals.subtotal}
            discount={totals.discount}
            referralDiscount={totals.referralDiscount}
            giftCardApplied={totals.giftCardApplied}
            deliveryFee={totals.deliveryFee}
            total={totals.total}
            couponCode={coupon?.code}
            estimate
          />
          <p className="text-muted-foreground mt-3 text-sm">
            We confirm the final total when you place the order.
          </p>
          <Link
            href="/cart"
            className="text-brand focus-visible:outline-ring mt-2 inline-flex min-h-11 items-center font-medium underline underline-offset-4 focus-visible:outline-2"
          >
            Change items
          </Link>
        </div>
      </aside>

      {/* Phones: the total and the button stay under the thumb. */}
      <div className="bg-paper/90 border-ink/10 fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl lg:hidden">
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-sm">Estimated total</p>
          <p className="font-semibold tabular-nums">{formatNpr(totals.total)}</p>
        </div>
        <button
          type="submit"
          form="checkout-form"
          disabled={busy}
          className={cn(buttonVariants(), "h-12 px-6")}
        >
          {busy ? "Placing order" : "Place order"}
        </button>
      </div>
    </div>
  );
}

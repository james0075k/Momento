"use client";

import { reviewInputSchema } from "@momento/shared";
import { Star } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { ApiError, apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";

const field =
  "border-input bg-surface focus-visible:outline-ring min-h-11 w-full rounded-md border px-4 text-base focus-visible:outline-2 focus-visible:outline-offset-2";

type Errors = Partial<
  Record<"name" | "rating" | "comment" | "orderCode" | "orderPhone" | "form", string>
>;

/** "Write a review". Reviews are held for a check first; a matching order code and phone adds a Verified badge. */
export function ReviewForm({ productId }: { productId: string }) {
  const [rating, setRating] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = (key: string) => String(data.get(key) ?? "").trim();
    const orderCode = text("orderCode");
    const orderPhone = text("orderPhone");

    const parsed = reviewInputSchema.safeParse({
      productId,
      name: text("name"),
      rating: rating || undefined,
      title: text("title") || undefined,
      comment: text("comment"),
      orderCode: orderCode || undefined,
      orderPhone: orderPhone || undefined,
    });
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]) as keyof Errors;
        next[key] ??=
          key === "rating"
            ? "Choose a star rating."
            : key === "name"
              ? "Enter your name."
              : key === "comment"
                ? "Tell us a little about it."
                : key === "orderCode" || key === "orderPhone"
                  ? "Enter both the order code and the phone you ordered with, or leave both empty."
                  : issue.message;
      }
      setErrors(next);
      return;
    }

    setErrors({});
    setBusy(true);
    try {
      await apiRequest("/reviews", { method: "POST", body: parsed.data });
      setSent(true);
    } catch (error) {
      setErrors({
        form: error instanceof ApiError ? error.message : "Could not send your review.",
      });
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div role="status" className="border-success/40 bg-surface rounded-2xl border p-6">
        <h3 className="text-xl font-semibold">Thank you for your review</h3>
        <p className="text-muted-foreground mt-2">It will show here once we have checked it.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="bg-surface space-y-5 rounded-2xl p-5 md:p-7">
      <h3 className="text-2xl font-semibold">Write a review</h3>

      <fieldset>
        <legend className="mb-2 font-medium">Your rating</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} ${n === 1 ? "star" : "stars"}`}
              aria-pressed={rating === n}
              onClick={() => setRating(n)}
              className="focus-visible:outline-ring inline-flex size-11 items-center justify-center rounded-md focus-visible:outline-2"
            >
              <Star
                aria-hidden
                className={cn("size-7", n <= rating ? "fill-accent stroke-ink" : "stroke-ink/60")}
              />
            </button>
          ))}
        </div>
        {errors.rating && (
          <p role="alert" className="text-brand mt-1 text-sm">
            {errors.rating}
          </p>
        )}
      </fieldset>

      <div>
        <label htmlFor="review-name" className="mb-1 block font-medium">
          Your name
        </label>
        <input id="review-name" name="name" autoComplete="name" maxLength={80} className={field} />
        {errors.name && (
          <p role="alert" className="text-brand mt-1 text-sm">
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="review-title" className="mb-1 block font-medium">
          Headline <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <input id="review-title" name="title" maxLength={120} className={field} />
      </div>

      <div>
        <label htmlFor="review-comment" className="mb-1 block font-medium">
          Your review
        </label>
        <textarea
          id="review-comment"
          name="comment"
          rows={4}
          maxLength={2000}
          className={cn(field, "py-3")}
        />
        {errors.comment && (
          <p role="alert" className="text-brand mt-1 text-sm">
            {errors.comment}
          </p>
        )}
      </div>

      <details className="bg-muted rounded-xl px-4 py-3">
        <summary className="focus-visible:outline-ring min-h-11 cursor-pointer py-2 font-medium focus-visible:outline-2">
          Bought this from us? Get a Verified badge
        </summary>
        <div className="grid gap-4 pt-2 sm:grid-cols-2">
          <div>
            <label htmlFor="review-code" className="mb-1 block text-sm font-medium">
              Order code
            </label>
            <input
              id="review-code"
              name="orderCode"
              placeholder="MOM-2026-0001"
              className={field}
            />
          </div>
          <div>
            <label htmlFor="review-phone" className="mb-1 block text-sm font-medium">
              Phone you ordered with
            </label>
            <input
              id="review-phone"
              name="orderPhone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              className={field}
            />
          </div>
        </div>
        {(errors.orderCode || errors.orderPhone) && (
          <p role="alert" className="text-brand mt-2 text-sm">
            {errors.orderCode ?? errors.orderPhone}
          </p>
        )}
      </details>

      {errors.form && (
        <p role="alert" className="text-brand text-sm">
          {errors.form}
        </p>
      )}
      <Button type="submit" size="lg" disabled={busy} className="h-12 w-full sm:w-auto">
        {busy ? "Sending" : "Send review"}
      </Button>
    </form>
  );
}

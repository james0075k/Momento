"use client";

import {
  reviewReplyInputSchema,
  reviewStatusSchema,
  type Product,
  type Review,
  type ReviewStatus,
  type Service,
} from "@momento/shared";
import { BadgeCheck } from "lucide-react";
import Image from "next/image";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Stars } from "@/components/home/stars";
import { adminList, adminRequest, query } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import { formatNepalDateTime } from "@/lib/format";
import { useAdminData } from "@/lib/use-admin-data";
import { ConfirmButton, Modal, Select } from "./controls";
import { Pagination } from "./data-table";
import { useAdmin } from "./session";
import { Badge, ErrorNote, Field, Loading, PageHeader } from "./ui";

const LIMIT = 20;

const STATUS_LABEL: Record<ReviewStatus, string> = {
  pending: "Waiting for approval",
  approved: "Approved",
  rejected: "Rejected",
};
const STATUS_TONE = { pending: "warning", approved: "success", rejected: "danger" } as const;

const buttonClass =
  "focus-visible:outline-ring inline-flex min-h-11 items-center justify-center rounded-md px-5 font-medium focus-visible:outline-2 disabled:opacity-50";
const primary = `${buttonClass} bg-brand text-surface`;
const secondary = `${buttonClass} border-input bg-surface border`;

const failure = (error: unknown): string =>
  error instanceof ApiError ? error.message : "Something went wrong. Please try again.";

function ReplyForm({
  review,
  onSaved,
  onCancel,
}: {
  review: Review;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(review.reply ?? "");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const parsed = reviewReplyInputSchema.safeParse({ reply: text });
    if (!parsed.success) {
      setError("Keep the reply under 1000 characters.");
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await adminRequest(`/reviews/${review.id}/reply`, { method: "PATCH", body: parsed.data });
      toast.success(parsed.data.reply ? "Reply saved" : "Reply removed");
      onSaved();
    } catch (err) {
      setError(failure(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <blockquote className="bg-surface rounded-xl p-3">
        <Stars rating={review.rating} />
        <p className="mt-1 whitespace-pre-line">{review.comment}</p>
        <footer className="text-muted-foreground mt-1 text-sm">{review.name}</footer>
      </blockquote>
      <Field
        id="review-reply"
        label="Your reply"
        hint="Anyone can read it under the review once the review is approved. Leave it empty to remove your reply."
        error={error}
      >
        <textarea
          id="review-reply"
          value={text}
          maxLength={1000}
          rows={5}
          onChange={(event) => setText(event.target.value)}
          className="border-input bg-surface focus-visible:outline-ring w-full rounded-md border p-3 focus-visible:outline-2"
        />
      </Field>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={secondary}>
          Cancel
        </button>
        <button type="submit" disabled={busy} className={primary}>
          {busy ? "Saving" : "Save reply"}
        </button>
      </div>
    </form>
  );
}

function ReviewCard({
  review,
  itemName,
  onChange,
  onReply,
}: {
  review: Review;
  itemName: string;
  onChange: () => void;
  onReply: () => void;
}) {
  const { isAdmin } = useAdmin();
  const [busy, setBusy] = useState(false);

  const setStatus = async (status: ReviewStatus) => {
    if (busy) return;
    setBusy(true);
    try {
      await adminRequest(`/reviews/${review.id}/status`, { method: "PATCH", body: { status } });
      toast.success(`Review ${STATUS_LABEL[status].toLowerCase()}`);
      onChange();
    } catch (error) {
      toast.error(failure(error));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    try {
      await adminRequest(`/reviews/${review.id}`, { method: "DELETE" });
      toast.success("Review deleted");
      onChange();
    } catch (error) {
      toast.error(failure(error));
    }
  };

  return (
    <li className="bg-surface rounded-2xl p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Stars rating={review.rating} />
        <Badge tone={STATUS_TONE[review.status]}>{STATUS_LABEL[review.status]}</Badge>
        {review.verified && (
          <span className="text-success inline-flex items-center gap-1 text-sm font-medium">
            <BadgeCheck aria-hidden className="size-4" />
            Verified purchase{review.verifiedOrderCode ? ` (${review.verifiedOrderCode})` : ""}
          </span>
        )}
      </div>
      {review.title && <h2 className="mt-2 text-lg font-semibold">{review.title}</h2>}
      <p className="mt-1 max-w-prose whitespace-pre-line">{review.comment}</p>
      {review.photos.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {review.photos.map((photo, index) => (
            <li key={photo} className="relative size-20 overflow-hidden rounded-xl">
              <Image
                src={photo}
                alt={`Photo ${index + 1} from ${review.name}`}
                fill
                sizes="5rem"
                className="object-cover"
              />
            </li>
          ))}
        </ul>
      )}
      <p className="text-muted-foreground mt-3 text-sm">
        {review.name} on {itemName}, {formatNepalDateTime(review.createdAt)}
      </p>

      {review.reply && (
        <div className="bg-paper mt-3 rounded-xl p-3">
          <p className="text-sm font-semibold">
            Your reply
            {review.repliedAt && (
              <span className="text-muted-foreground font-normal">
                {" "}
                ({formatNepalDateTime(review.repliedAt)})
              </span>
            )}
          </p>
          <p className="whitespace-pre-line">{review.reply}</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {review.status !== "approved" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void setStatus("approved")}
            className={primary}
          >
            Approve
          </button>
        )}
        {review.status !== "rejected" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void setStatus("rejected")}
            className={secondary}
          >
            Reject
          </button>
        )}
        {review.status !== "pending" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void setStatus("pending")}
            className={secondary}
          >
            Back to waiting
          </button>
        )}
        <button type="button" onClick={onReply} className={secondary}>
          {review.reply ? "Edit reply" : "Reply"}
        </button>
        {isAdmin && (
          <ConfirmButton
            label="Delete"
            title="Delete this review?"
            message="It is removed for good, and its reply with it. Rejecting hides a review without deleting it."
            confirmLabel="Delete review"
            onConfirm={remove}
          />
        )}
      </div>
    </li>
  );
}

export function ReviewsAdmin() {
  const [status, setStatus] = useState<ReviewStatus>("pending");
  const [page, setPage] = useState(1);
  const [replying, setReplying] = useState<Review | null>(null);

  const reviews = useAdminData(
    () => adminList<Review>(`/reviews${query({ page, limit: LIMIT, status })}`),
    [status, page],
  );
  // Names for the "on <product>" line. Only the first 100 of each are looked up; others read "an item".
  const products = useAdminData(() =>
    adminList<Product>("/products?limit=100&includeInactive=true"),
  );
  const services = useAdminData(() =>
    adminList<Service>("/services?limit=100&includeInactive=true"),
  );
  const names = new Map<string, string>([
    ...(products.data?.data ?? []).map((item): [string, string] => [item.id, item.title]),
    ...(services.data?.data ?? []).map((item): [string, string] => [item.id, item.title]),
  ]);

  return (
    <>
      <PageHeader
        title="Reviews"
        description="Customers' reviews stay hidden until you approve them. You can also answer them in public."
      />

      <div className="mb-5 max-w-xs">
        <label htmlFor="review-status" className="sr-only">
          Show reviews
        </label>
        <Select
          id="review-status"
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(reviewStatusSchema.parse(event.target.value));
          }}
        >
          {reviewStatusSchema.options.map((value) => (
            <option key={value} value={value}>
              {STATUS_LABEL[value]}
            </option>
          ))}
        </Select>
      </div>

      {reviews.error && <ErrorNote message={reviews.error} onRetry={reviews.reload} />}
      {reviews.loading && !reviews.data && <Loading />}
      {reviews.data && (
        <>
          {reviews.data.data.length === 0 ? (
            <p className="border-ink/15 text-muted-foreground rounded-2xl border border-dashed px-6 py-10 text-center">
              No reviews here.
            </p>
          ) : (
            <ul className="space-y-4">
              {reviews.data.data.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  itemName={names.get(review.productId ?? review.serviceId ?? "") ?? "an item"}
                  onChange={reviews.reload}
                  onReply={() => setReplying(review)}
                />
              ))}
            </ul>
          )}
          <Pagination
            page={reviews.data.meta.page}
            totalPages={reviews.data.meta.totalPages}
            onPage={setPage}
          />
        </>
      )}

      <Modal open={replying !== null} title="Reply to review" onClose={() => setReplying(null)}>
        {replying && (
          <ReplyForm
            review={replying}
            onCancel={() => setReplying(null)}
            onSaved={() => {
              setReplying(null);
              reviews.reload();
            }}
          />
        )}
      </Modal>
    </>
  );
}

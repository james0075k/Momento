"use client";

import { giftCardInputSchema, type GiftCard } from "@momento/shared";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { adminList, adminRequest } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import { formatNpr } from "@/lib/format";
import { apiErrorsToForm, issuesToErrors } from "@/lib/form-errors";
import { useAdminData } from "@/lib/use-admin-data";
import { CopyButton } from "@/components/cart/copy-button";
import { Modal } from "./controls";
import { DataTable } from "./data-table";
import { Badge, Card, ErrorNote, Field, inputClass, Loading, PageHeader } from "./ui";

function IssueForm({
  onSaved,
  onCancel,
}: {
  onSaved: (card: GiftCard) => void;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const parsed = giftCardInputSchema.safeParse({
      amount: /^\d+$/.test(amount.trim()) ? Number(amount) : Number.NaN,
      note: note.trim() || undefined,
      code: code.trim() || undefined,
    });
    if (!parsed.success) {
      const found = issuesToErrors(parsed.error.issues);
      setErrors(
        found["amount"]
          ? { ...found, amount: "Enter a whole number of rupees, at least 100." }
          : found,
      );
      return;
    }
    setBusy(true);
    setErrors({});
    try {
      onSaved(await adminRequest<GiftCard>("/gift-cards", { body: parsed.data }));
    } catch (err) {
      const problems = apiErrorsToForm(err);
      setErrors(problems.fields["slug"] ? { code: "That code is already used." } : problems.fields);
      setFormError(problems.form);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <p className="text-muted-foreground">
        Issue a card after the customer has paid (by eSewa, Khalti or bank). Then send them the
        code.
      </p>
      <Field id="gc-amount" label="Amount (NPR)" hint="At least 100." error={errors["amount"]}>
        <input
          id="gc-amount"
          inputMode="numeric"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className={inputClass}
        />
      </Field>
      <Field
        id="gc-note"
        label="Note"
        hint="Optional, only you see it. For example who bought it."
        error={errors["note"]}
      >
        <input
          id="gc-note"
          value={note}
          maxLength={200}
          onChange={(event) => setNote(event.target.value)}
          className={inputClass}
        />
      </Field>
      <Field
        id="gc-code"
        label="Code"
        hint="Optional. Leave empty and we make one like GC-K7Q2-XF9M."
        error={errors["code"]}
      >
        <input
          id="gc-code"
          value={code}
          maxLength={24}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          className={inputClass}
        />
      </Field>
      {formError && (
        <p role="alert" className="bg-brand/10 text-brand rounded-xl px-4 py-3 font-medium">
          {formError}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="border-input bg-surface focus-visible:outline-ring min-h-11 rounded-md border px-5 font-medium focus-visible:outline-2"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="bg-brand text-surface focus-visible:outline-ring min-h-11 rounded-md px-5 font-medium focus-visible:outline-2"
        >
          {busy ? "Issuing" : "Issue gift card"}
        </button>
      </div>
    </form>
  );
}

export function GiftCardsAdmin() {
  const { data, error, loading, reload } = useAdminData(() =>
    adminList<GiftCard>("/gift-cards?limit=100"),
  );
  const [issuing, setIssuing] = useState(false);
  const [issued, setIssued] = useState<GiftCard | null>(null);

  // The flag is off: the API answers 404 for the whole feature.
  const switchedOff = error && /not found/i.test(error);

  const toggle = async (card: GiftCard) => {
    try {
      await adminRequest(`/gift-cards/${card.id}`, {
        method: "PATCH",
        body: { isActive: !card.isActive },
      });
      toast.success(card.isActive ? "Gift card switched off" : "Gift card switched on");
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not change it.");
    }
  };

  return (
    <>
      <PageHeader
        title="Gift cards"
        description="Cards customers can spend at checkout, delivery included."
        actions={
          !switchedOff && (
            <button
              type="button"
              onClick={() => setIssuing(true)}
              className="bg-brand text-surface focus-visible:outline-ring inline-flex min-h-11 items-center rounded-md px-5 font-medium focus-visible:outline-2"
            >
              Issue a gift card
            </button>
          )
        }
      />
      {switchedOff && (
        <Card>
          <p className="font-medium">Gift cards are switched off.</p>
          <p className="text-muted-foreground mt-1">
            Turn on the “Gift cards” feature in the feature settings to start using them.
          </p>
        </Card>
      )}
      {error && !switchedOff && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data && !error && <Loading />}
      {data && (
        <DataTable
          caption="Gift cards"
          rows={data.data}
          rowKey={(card) => card.id}
          empty="No gift cards yet."
          columns={[
            { header: "Code", cell: (card) => <span className="font-medium">{card.code}</span> },
            {
              header: "Balance",
              cell: (card) => `${formatNpr(card.balance)} of ${formatNpr(card.initialAmount)}`,
            },
            { header: "Note", cell: (card) => card.note ?? "" },
            {
              header: "Status",
              cell: (card) => (
                <Badge tone={card.isActive ? "success" : "neutral"}>
                  {card.isActive ? "Active" : "Off"}
                </Badge>
              ),
            },
            {
              header: "Actions",
              cell: (card) => (
                <button
                  type="button"
                  aria-label={`${card.isActive ? "Switch off" : "Switch on"} ${card.code}`}
                  onClick={() => void toggle(card)}
                  className="text-brand focus-visible:outline-ring inline-flex min-h-11 items-center px-2 font-medium underline underline-offset-4 focus-visible:outline-2"
                >
                  {card.isActive ? "Switch off" : "Switch on"}
                </button>
              ),
            },
          ]}
        />
      )}
      <Modal open={issuing} title="Issue a gift card" onClose={() => setIssuing(false)}>
        <IssueForm
          onCancel={() => setIssuing(false)}
          onSaved={(card) => {
            setIssuing(false);
            setIssued(card);
            reload();
          }}
        />
      </Modal>
      <Modal open={issued !== null} title="Gift card issued" onClose={() => setIssued(null)}>
        {issued && (
          <div className="space-y-3">
            <p>
              Send this code to the customer. It is worth{" "}
              <strong>{formatNpr(issued.balance)}</strong>.
            </p>
            <p className="bg-surface flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-2xl font-semibold">
              <span>{issued.code}</span>
              <CopyButton value={issued.code} label="gift card code" />
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIssued(null)}
                className="bg-brand text-surface focus-visible:outline-ring min-h-11 rounded-md px-5 font-medium focus-visible:outline-2"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

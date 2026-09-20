"use client";

import { couponInputSchema, type Coupon } from "@momento/shared";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { adminList, adminRequest } from "@/lib/admin-api";
import { formatNpr } from "@/lib/format";
import { apiErrorsToForm, issuesToErrors } from "@/lib/form-errors";
import { endOfNepalDay, toNepalDay } from "@/lib/nepal-date";
import { useAdminData } from "@/lib/use-admin-data";
import { ConfirmButton, Modal, Select, Switch } from "./controls";
import { DataTable } from "./data-table";
import { Badge, ErrorNote, Field, inputClass, Loading, PageHeader } from "./ui";

interface FormState {
  code: string;
  type: "percent" | "fixed";
  value: string;
  minOrderAmount: string;
  expiresOn: string;
  usageLimit: string;
  isActive: boolean;
}

const blank = (): FormState => ({
  code: "",
  type: "percent",
  value: "",
  minOrderAmount: "",
  expiresOn: "",
  usageLimit: "",
  isActive: true,
});

const fromCoupon = (coupon: Coupon): FormState => ({
  code: coupon.code,
  type: coupon.type,
  value: String(coupon.value),
  minOrderAmount: coupon.minOrderAmount === undefined ? "" : String(coupon.minOrderAmount),
  expiresOn: coupon.expiresAt ? toNepalDay(coupon.expiresAt) : "",
  usageLimit: coupon.usageLimit === undefined ? "" : String(coupon.usageLimit),
  isActive: coupon.isActive,
});

const whole = /^\d+$/;

function CouponForm({
  editing,
  onSaved,
  onCancel,
}: {
  editing: Coupon | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(editing ? fromCoupon(editing) : blank());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const found: Record<string, string> = {};
    if (!whole.test(form.value.trim())) found["value"] = "Enter a whole number.";
    if (form.minOrderAmount.trim() && !whole.test(form.minOrderAmount.trim())) {
      found["minOrderAmount"] = "Enter a whole number of rupees, or leave it empty.";
    }
    if (form.usageLimit.trim() && !whole.test(form.usageLimit.trim())) {
      found["usageLimit"] = "Enter a whole number, or leave it empty.";
    }
    const parsed = couponInputSchema.safeParse({
      code: form.code,
      type: form.type,
      value: whole.test(form.value.trim()) ? Number(form.value) : 0,
      minOrderAmount: form.minOrderAmount.trim() ? Number(form.minOrderAmount) : undefined,
      expiresAt: form.expiresOn ? endOfNepalDay(form.expiresOn) : undefined,
      usageLimit: form.usageLimit.trim() ? Number(form.usageLimit) : undefined,
      isActive: form.isActive,
    });
    if (!parsed.success || Object.keys(found).length > 0) {
      setErrors({ ...(parsed.success ? {} : issuesToErrors(parsed.error.issues)), ...found });
      return;
    }
    setBusy(true);
    setErrors({});
    try {
      await adminRequest(editing ? `/coupons/${editing.id}` : "/coupons", {
        method: editing ? "PATCH" : "POST",
        body: parsed.data,
      });
      toast.success(editing ? "Coupon saved" : "Coupon created");
      onSaved();
    } catch (err) {
      const problems = apiErrorsToForm(err);
      setErrors(problems.fields["slug"] ? { code: "That code is already used." } : problems.fields);
      setFormError(problems.form);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field
        id="coupon-code"
        label="Code"
        hint="Letters, numbers, hyphens. Customers type it at checkout."
        error={errors["code"]}
      >
        <input
          id="coupon-code"
          value={form.code}
          maxLength={32}
          onChange={(event) => set("code", event.target.value.toUpperCase())}
          className={inputClass}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="coupon-type" label="Type">
          <Select
            id="coupon-type"
            value={form.type}
            onChange={(event) => set("type", event.target.value as FormState["type"])}
          >
            <option value="percent">Percent off</option>
            <option value="fixed">Fixed amount off (NPR)</option>
          </Select>
        </Field>
        <Field
          id="coupon-value"
          label={form.type === "percent" ? "Percent (1 to 100)" : "Amount (NPR)"}
          error={errors["value"]}
        >
          <input
            id="coupon-value"
            inputMode="numeric"
            value={form.value}
            onChange={(event) => set("value", event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field
          id="coupon-min"
          label="Minimum order (NPR)"
          hint="Optional."
          error={errors["minOrderAmount"]}
        >
          <input
            id="coupon-min"
            inputMode="numeric"
            value={form.minOrderAmount}
            onChange={(event) => set("minOrderAmount", event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field
          id="coupon-limit"
          label="Times it can be used"
          hint="Optional."
          error={errors["usageLimit"]}
        >
          <input
            id="coupon-limit"
            inputMode="numeric"
            value={form.usageLimit}
            onChange={(event) => set("usageLimit", event.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
      <Field
        id="coupon-expires"
        label="Last day it works"
        hint="Optional. Nepal time."
        error={errors["expiresAt"]}
      >
        <input
          id="coupon-expires"
          type="date"
          value={form.expiresOn}
          onChange={(event) => set("expiresOn", event.target.value)}
          className={`${inputClass} max-w-48`}
        />
      </Field>
      <Switch
        id="coupon-active"
        label="Active"
        checked={form.isActive}
        onChange={(value) => set("isActive", value)}
      />
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
          {busy ? "Saving" : "Save coupon"}
        </button>
      </div>
    </form>
  );
}

const describe = (coupon: Coupon) =>
  coupon.type === "percent" ? `${coupon.value}% off` : `${formatNpr(coupon.value)} off`;

export function CouponsAdmin() {
  const { data, error, loading, reload } = useAdminData(() =>
    adminList<Coupon>("/coupons?limit=100"),
  );
  const [dialog, setDialog] = useState<{ editing: Coupon | null } | null>(null);

  const remove = async (coupon: Coupon) => {
    await adminRequest(`/coupons/${coupon.id}`, { method: "DELETE" });
    toast.success(`Deleted ${coupon.code}`);
    reload();
  };

  return (
    <>
      <PageHeader
        title="Coupons"
        description="Discount codes customers enter at checkout."
        actions={
          <button
            type="button"
            onClick={() => setDialog({ editing: null })}
            className="bg-brand text-surface focus-visible:outline-ring inline-flex min-h-11 items-center rounded-md px-5 font-medium focus-visible:outline-2"
          >
            New coupon
          </button>
        }
      />
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && (
        <DataTable
          caption="Coupons"
          rows={data.data}
          rowKey={(coupon) => coupon.id}
          empty="No coupons yet."
          columns={[
            {
              header: "Code",
              cell: (coupon) => <span className="font-medium">{coupon.code}</span>,
            },
            { header: "Discount", cell: describe },
            {
              header: "Minimum order",
              cell: (coupon) => (coupon.minOrderAmount ? formatNpr(coupon.minOrderAmount) : "None"),
            },
            {
              header: "Used",
              cell: (coupon) =>
                `${coupon.usedCount}${coupon.usageLimit ? ` of ${coupon.usageLimit}` : ""}`,
            },
            {
              header: "Last day",
              cell: (coupon) => (coupon.expiresAt ? toNepalDay(coupon.expiresAt) : "No end date"),
            },
            {
              header: "Status",
              cell: (coupon) => (
                <Badge tone={coupon.isActive ? "success" : "neutral"}>
                  {coupon.isActive ? "Active" : "Off"}
                </Badge>
              ),
            },
            {
              header: "Actions",
              cell: (coupon) => (
                <span className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Edit ${coupon.code}`}
                    onClick={() => setDialog({ editing: coupon })}
                    className="text-brand focus-visible:outline-ring inline-flex min-h-11 items-center px-2 font-medium underline underline-offset-4 focus-visible:outline-2"
                  >
                    Edit
                  </button>
                  <ConfirmButton
                    label="Delete"
                    title={`Delete ${coupon.code}?`}
                    message="The code stops working. Orders that already used it are not changed."
                    confirmLabel="Delete coupon"
                    onConfirm={() => remove(coupon)}
                  />
                </span>
              ),
            },
          ]}
        />
      )}
      <Modal
        open={dialog !== null}
        title={dialog?.editing ? "Edit coupon" : "New coupon"}
        onClose={() => setDialog(null)}
      >
        <CouponForm
          editing={dialog?.editing ?? null}
          onCancel={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            reload();
          }}
        />
      </Modal>
    </>
  );
}

"use client";

import { categoryInputSchema, type Category } from "@momento/shared";
import Image from "next/image";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { adminList, adminRequest } from "@/lib/admin-api";
import { apiErrorsToForm, issuesToErrors } from "@/lib/form-errors";
import { slugify } from "@/lib/slugify";
import { useAdminData } from "@/lib/use-admin-data";
import { ConfirmButton, Modal, Switch } from "./controls";
import { DataTable } from "./data-table";
import { ImageField } from "./image-field";
import { useAdmin } from "./session";
import { Badge, ErrorNote, Field, inputClass, Loading, PageHeader } from "./ui";

interface FormState {
  name: string;
  slug: string;
  slugTouched: boolean;
  images: string[];
  order: string;
  isActive: boolean;
}

const blank = (): FormState => ({
  name: "",
  slug: "",
  slugTouched: false,
  images: [],
  order: "0",
  isActive: true,
});

const fromCategory = (category: Category): FormState => ({
  name: category.name,
  slug: category.slug,
  slugTouched: true,
  images: category.image ? [category.image] : [],
  order: String(category.order),
  isActive: category.isActive,
});

function CategoryForm({
  editing,
  onSaved,
  onCancel,
}: {
  editing: Category | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(editing ? fromCategory(editing) : blank());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const parsed = categoryInputSchema.safeParse({
      name: form.name,
      slug: form.slug,
      image: form.images[0],
      order: /^\d+$/.test(form.order.trim()) ? Number(form.order) : Number.NaN,
      isActive: form.isActive,
    });
    if (!parsed.success) {
      setErrors(issuesToErrors(parsed.error.issues));
      return;
    }
    setBusy(true);
    setErrors({});
    try {
      await adminRequest(editing ? `/categories/${editing.id}` : "/categories", {
        method: editing ? "PATCH" : "POST",
        body: parsed.data,
      });
      toast.success(editing ? "Category saved" : "Category created");
      onSaved();
    } catch (err) {
      const problems = apiErrorsToForm(err);
      setErrors(problems.fields);
      setFormError(problems.form);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field id="cat-name" label="Name" error={errors["name"]}>
        <input
          id="cat-name"
          value={form.name}
          maxLength={100}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              name: event.target.value,
              slug: current.slugTouched ? current.slug : slugify(event.target.value),
            }))
          }
          className={inputClass}
        />
      </Field>
      <Field id="cat-slug" label="Web address" error={errors["slug"]}>
        <input
          id="cat-slug"
          value={form.slug}
          maxLength={120}
          onChange={(event) =>
            setForm((current) => ({ ...current, slug: event.target.value, slugTouched: true }))
          }
          className={inputClass}
        />
      </Field>
      <ImageField
        label="Image"
        images={form.images}
        onChange={(images) => setForm((current) => ({ ...current, images }))}
        folder="categories"
        max={1}
      />
      <Field
        id="cat-order"
        label="Position"
        hint="Smaller numbers come first."
        error={errors["order"]}
      >
        <input
          id="cat-order"
          inputMode="numeric"
          value={form.order}
          onChange={(event) => setForm((current) => ({ ...current, order: event.target.value }))}
          className={`${inputClass} max-w-32`}
        />
      </Field>
      <Switch
        id="cat-active"
        label="Visible in the shop"
        checked={form.isActive}
        onChange={(value) => setForm((current) => ({ ...current, isActive: value }))}
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
          {busy ? "Saving" : "Save category"}
        </button>
      </div>
    </form>
  );
}

export function CategoriesAdmin() {
  const { isAdmin } = useAdmin();
  const { data, error, loading, reload } = useAdminData(() =>
    adminList<Category>("/categories?limit=100&includeInactive=true"),
  );
  const [dialog, setDialog] = useState<{ editing: Category | null } | null>(null);

  const remove = async (category: Category) => {
    try {
      await adminRequest(`/categories/${category.id}`, { method: "DELETE" });
      toast.success(`Deleted ${category.name}`);
      reload();
    } catch (err) {
      toast.error(apiErrorsToForm(err).form ?? "Could not delete it.");
    }
  };

  return (
    <>
      <PageHeader
        title="Categories"
        description="Group products, for example photo books, frames and canvases."
        actions={
          <button
            type="button"
            onClick={() => setDialog({ editing: null })}
            className="bg-brand text-surface focus-visible:outline-ring inline-flex min-h-11 items-center rounded-md px-5 font-medium focus-visible:outline-2"
          >
            New category
          </button>
        }
      />
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && (
        <DataTable
          caption="Categories"
          rows={data.data}
          rowKey={(category) => category.id}
          empty="No categories yet."
          columns={[
            {
              header: "Category",
              cell: (category) => (
                <span className="flex items-center gap-3">
                  <span className="bg-muted relative block size-10 shrink-0 overflow-hidden rounded-lg">
                    {category.image && (
                      <Image
                        src={category.image}
                        alt=""
                        fill
                        sizes="2.5rem"
                        className="object-cover"
                      />
                    )}
                  </span>
                  <span className="font-medium">{category.name}</span>
                </span>
              ),
            },
            { header: "Web address", cell: (category) => category.slug },
            { header: "Position", cell: (category) => category.order },
            {
              header: "Status",
              cell: (category) => (
                <Badge tone={category.isActive ? "success" : "neutral"}>
                  {category.isActive ? "Visible" : "Hidden"}
                </Badge>
              ),
            },
            {
              header: "Actions",
              cell: (category) => (
                <span className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Edit ${category.name}`}
                    onClick={() => setDialog({ editing: category })}
                    className="text-brand focus-visible:outline-ring inline-flex min-h-11 items-center px-2 font-medium underline underline-offset-4 focus-visible:outline-2"
                  >
                    Edit
                  </button>
                  {isAdmin && (
                    <ConfirmButton
                      label="Delete"
                      title={`Delete ${category.name}?`}
                      message="Products in this category keep working, but will show no category until you change them."
                      confirmLabel="Delete category"
                      onConfirm={() => remove(category)}
                    />
                  )}
                </span>
              ),
            },
          ]}
        />
      )}
      <Modal
        open={dialog !== null}
        title={dialog?.editing ? "Edit category" : "New category"}
        onClose={() => setDialog(null)}
      >
        <CategoryForm
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

"use client";

import type { Category, Product } from "@momento/shared";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import { OCCASIONS } from "@/config/occasions";
import { adminList, adminRequest } from "@/lib/admin-api";
import { apiErrorsToForm } from "@/lib/form-errors";
import {
  emptyProductForm,
  formFromProduct,
  toProductInput,
  type ProductFormState,
} from "@/lib/product-form";
import { slugify } from "@/lib/slugify";
import { useAdminData } from "@/lib/use-admin-data";
import { cn } from "@/lib/utils";
import { ConfirmButton, Select, Switch } from "./controls";
import { ImageField } from "./image-field";
import { PairListEditor, StringListEditor } from "./list-editors";
import { useAdmin } from "./session";
import { Card, ErrorNote, Field, inputClass, Loading, PageHeader } from "./ui";

// The editor library is large and only this screen needs it, so it loads on demand.
const RichTextEditor = dynamic(() => import("./rich-text-editor").then((m) => m.RichTextEditor), {
  ssr: false,
  loading: () => <p className="text-muted-foreground">Loading editor</p>,
});

const smallButton =
  "border-input bg-surface hover:bg-muted focus-visible:outline-ring inline-flex min-h-11 items-center rounded-md border px-4 text-sm font-medium focus-visible:outline-2";

export function ProductEditor({ id }: { id?: string }) {
  const router = useRouter();
  const { isAdmin } = useAdmin();
  const { data, error, loading, reload } = useAdminData(async () => {
    const [categories, product] = await Promise.all([
      adminList<Category>("/categories?limit=100&includeInactive=true"),
      id ? adminRequest<Product>(`/products/${id}`) : Promise.resolve(undefined),
    ]);
    return { categories: categories.data, product };
  }, [id]);

  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (loading || !data) return <Loading label="Loading product" />;

  return (
    <ProductForm
      key={id ?? "new"}
      id={id}
      categories={data.categories}
      initial={data.product ? formFromProduct(data.product) : emptyProductForm()}
      canDelete={isAdmin}
      onDone={() => router.push("/admin/products")}
    />
  );
}

function ProductForm({
  id,
  categories,
  initial,
  canDelete,
  onDone,
}: {
  id?: string;
  categories: Category[];
  initial: ProductFormState;
  canDelete: boolean;
  onDone: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const update = <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const result = toProductInput(form);
    if (!result.input) {
      setErrors(result.errors);
      setFormError("Please fix the fields marked below.");
      return;
    }
    setErrors({});
    setFormError(undefined);
    setBusy(true);
    try {
      await adminRequest(id ? `/products/${id}` : "/products", {
        method: id ? "PATCH" : "POST",
        body: result.input,
      });
      toast.success(id ? "Product saved" : "Product created");
      onDone();
    } catch (err) {
      const problems = apiErrorsToForm(err);
      setErrors(problems.fields);
      setFormError(problems.form ?? "Please fix the fields marked below.");
      setBusy(false);
    }
  };

  const remove = async () => {
    await adminRequest(`/products/${id}`, { method: "DELETE" });
    toast.success("Product deleted");
    onDone();
  };

  const toggleOccasion = (slug: string) =>
    update(
      "occasions",
      form.occasions.includes(slug)
        ? form.occasions.filter((value) => value !== slug)
        : [...form.occasions, slug],
    );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <PageHeader
        title={id ? "Edit product" : "New product"}
        actions={
          <Link href="/admin/products" className={cn(buttonVariants({ variant: "outline" }))}>
            Back to products
          </Link>
        }
      />

      <Card title="Basics">
        <div className="space-y-4">
          <Field id="title" label="Title" error={errors["title"]}>
            <input
              id="title"
              value={form.title}
              maxLength={160}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                  slug: current.slugTouched ? current.slug : slugify(event.target.value),
                }))
              }
              className={inputClass}
            />
          </Field>
          <Field
            id="slug"
            label="Web address"
            hint="Used in the link: /shop/your-web-address. Lowercase letters, numbers and hyphens."
            error={errors["slug"]}
          >
            <input
              id="slug"
              value={form.slug}
              maxLength={120}
              onChange={(event) =>
                setForm((current) => ({ ...current, slug: event.target.value, slugTouched: true }))
              }
              className={inputClass}
            />
          </Field>
          <Field id="category" label="Category" error={errors["categoryId"]}>
            <Select
              id="category"
              value={form.categoryId}
              onChange={(event) => update("categoryId", event.target.value)}
            >
              <option value="">Choose a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                  {category.isActive ? "" : " (hidden)"}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            id="shortDescription"
            label="Short description"
            hint="One or two sentences, shown on cards and search results."
            error={errors["shortDescription"]}
          >
            <textarea
              id="shortDescription"
              rows={2}
              maxLength={300}
              value={form.shortDescription}
              onChange={(event) => update("shortDescription", event.target.value)}
              className={`${inputClass} py-2`}
            />
          </Field>
          <div>
            <p className="mb-1 font-medium">Full description</p>
            <RichTextEditor
              label="Full description"
              value={form.description}
              onChange={(html) => update("description", html)}
            />
            {errors["description"] && (
              <p role="alert" className="text-brand mt-1 text-sm">
                {errors["description"]}
              </p>
            )}
          </div>
        </div>
      </Card>

      <Card title="Images">
        <ImageField
          label="Product images"
          images={form.images}
          onChange={(images) => update("images", images)}
          folder="products"
          max={12}
        />
        {errors["images"] && (
          <p role="alert" className="text-brand mt-2 text-sm">
            {errors["images"]}
          </p>
        )}
      </Card>

      <Card title="Price and sizes">
        <div className="space-y-4">
          <Field
            id="basePrice"
            label="Price (NPR)"
            hint="Used when the product has no sizes. With sizes, each size has its own price."
            error={errors["basePrice"]}
          >
            <input
              id="basePrice"
              inputMode="numeric"
              value={form.basePrice}
              onChange={(event) => update("basePrice", event.target.value)}
              className={inputClass}
            />
          </Field>

          <fieldset>
            <legend className="mb-2 font-medium">Sizes (variants)</legend>
            <ul className="space-y-3">
              {form.variants.map((row, index) => (
                <li key={row.id ?? index} className="bg-surface space-y-2 rounded-xl p-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Field
                      id={`v-size-${index}`}
                      label={`Size ${index + 1}`}
                      error={errors[`variants.${index}.size`]}
                    >
                      <input
                        id={`v-size-${index}`}
                        value={row.size}
                        placeholder="A5 (15 x 21 cm)"
                        onChange={(event) =>
                          update(
                            "variants",
                            form.variants.map((v, i) =>
                              i === index ? { ...v, size: event.target.value } : v,
                            ),
                          )
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field id={`v-cover-${index}`} label="Cover">
                      <input
                        id={`v-cover-${index}`}
                        value={row.cover}
                        placeholder="Softcover"
                        onChange={(event) =>
                          update(
                            "variants",
                            form.variants.map((v, i) =>
                              i === index ? { ...v, cover: event.target.value } : v,
                            ),
                          )
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field
                      id={`v-pages-${index}`}
                      label="Pages"
                      error={errors[`variants.${index}.pages`]}
                    >
                      <input
                        id={`v-pages-${index}`}
                        inputMode="numeric"
                        value={row.pages}
                        onChange={(event) =>
                          update(
                            "variants",
                            form.variants.map((v, i) =>
                              i === index ? { ...v, pages: event.target.value } : v,
                            ),
                          )
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field
                      id={`v-price-${index}`}
                      label="Price (NPR)"
                      error={errors[`variants.${index}.price`]}
                    >
                      <input
                        id={`v-price-${index}`}
                        inputMode="numeric"
                        value={row.price}
                        onChange={(event) =>
                          update(
                            "variants",
                            form.variants.map((v, i) =>
                              i === index ? { ...v, price: event.target.value } : v,
                            ),
                          )
                        }
                        className={inputClass}
                      />
                    </Field>
                  </div>
                  <button
                    type="button"
                    className={smallButton}
                    aria-label={`Remove size ${index + 1}`}
                    onClick={() =>
                      update(
                        "variants",
                        form.variants.filter((_, i) => i !== index),
                      )
                    }
                  >
                    Remove size
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className={`${smallButton} mt-2`}
              onClick={() =>
                update("variants", [
                  ...form.variants,
                  { size: "", cover: "", pages: "", price: "" },
                ])
              }
            >
              Add a size
            </button>
          </fieldset>
        </div>
      </Card>

      <Card title="Details">
        <div className="space-y-6">
          <StringListEditor
            id="highlights"
            label="Highlights"
            items={form.highlights}
            onChange={(items) => update("highlights", items)}
            addLabel="Add a highlight"
            placeholder="Lay-flat pages"
          />
          <fieldset>
            <legend className="mb-2 font-medium">Occasions</legend>
            <div className="flex flex-wrap gap-2">
              {OCCASIONS.map((occasion) => (
                <label
                  key={occasion.slug}
                  className="bg-surface flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4"
                >
                  <input
                    type="checkbox"
                    checked={form.occasions.includes(occasion.slug)}
                    onChange={() => toggleOccasion(occasion.slug)}
                    className="accent-brand size-4"
                  />
                  {occasion.name}
                </label>
              ))}
            </div>
          </fieldset>
          <PairListEditor
            id="specs"
            label="Specifications"
            items={form.specs}
            onChange={(items) => update("specs", items)}
            fields={{
              a: { key: "label", label: "Name", placeholder: "Paper" },
              b: { key: "value", label: "Value", placeholder: "170 gsm matte" },
            }}
            addLabel="Add a specification"
          />
          <PairListEditor
            id="faqs"
            label="Questions and answers"
            items={form.faqs}
            onChange={(items) => update("faqs", items)}
            fields={{
              a: { key: "question", label: "Question" },
              b: { key: "answer", label: "Answer", multiline: true },
            }}
            addLabel="Add a question"
          />
        </div>
      </Card>

      <Card title="Search results (SEO)">
        <div className="space-y-4">
          <Field
            id="seoTitle"
            label="Search title"
            hint="Up to 70 characters. Leave empty to use the product title."
            error={errors["seoTitle"]}
          >
            <input
              id="seoTitle"
              maxLength={70}
              value={form.seoTitle}
              onChange={(event) => update("seoTitle", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field
            id="seoDescription"
            label="Search description"
            hint="Up to 170 characters. Leave empty to use the short description."
            error={errors["seoDescription"]}
          >
            <textarea
              id="seoDescription"
              rows={2}
              maxLength={170}
              value={form.seoDescription}
              onChange={(event) => update("seoDescription", event.target.value)}
              className={`${inputClass} py-2`}
            />
          </Field>
        </div>
      </Card>

      <Card title="Visibility">
        <Switch
          id="isActive"
          label="Visible in the shop"
          checked={form.isActive}
          onChange={(value) => update("isActive", value)}
        />
        <Switch
          id="isFeatured"
          label="Featured on the home page"
          checked={form.isFeatured}
          onChange={(value) => update("isFeatured", value)}
        />
      </Card>

      {formError && (
        <p role="alert" className="bg-brand/10 text-brand rounded-xl px-4 py-3 font-medium">
          {formError}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className={cn(buttonVariants({ size: "lg" }), "h-12")}
        >
          {busy ? "Saving" : id ? "Save changes" : "Create product"}
        </button>
        {id && canDelete && (
          <ConfirmButton
            label="Delete product"
            title="Delete this product?"
            message="It disappears from the shop. Old orders keep their own copy of what was bought."
            confirmLabel="Delete product"
            onConfirm={remove}
          />
        )}
      </div>
    </form>
  );
}

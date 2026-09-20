"use client";

import type { Service } from "@momento/shared";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import { adminRequest } from "@/lib/admin-api";
import { apiErrorsToForm } from "@/lib/form-errors";
import {
  emptyServiceForm,
  formFromService,
  toServiceInput,
  type ServiceFormState,
} from "@/lib/service-form";
import { slugify } from "@/lib/slugify";
import { useAdminData } from "@/lib/use-admin-data";
import { cn } from "@/lib/utils";
import { ConfirmButton, Switch } from "./controls";
import { ImageField } from "./image-field";
import { useAdmin } from "./session";
import { Card, ErrorNote, Field, inputClass, Loading, PageHeader } from "./ui";

const RichTextEditor = dynamic(() => import("./rich-text-editor").then((m) => m.RichTextEditor), {
  ssr: false,
  loading: () => <p className="text-muted-foreground">Loading editor</p>,
});

export function ServiceEditor({ id }: { id?: string }) {
  const router = useRouter();
  const { isAdmin } = useAdmin();
  const { data, error, loading, reload } = useAdminData(
    async () => (id ? adminRequest<Service>(`/services/${id}`) : null),
    [id],
  );
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (loading || data === undefined) return <Loading label="Loading service" />;
  return (
    <ServiceForm
      key={id ?? "new"}
      id={id}
      initial={data ? formFromService(data) : emptyServiceForm()}
      canDelete={isAdmin}
      onDone={() => router.push("/admin/services")}
    />
  );
}

function ServiceForm({
  id,
  initial,
  canDelete,
  onDone,
}: {
  id?: string;
  initial: ServiceFormState;
  canDelete: boolean;
  onDone: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const update = <K extends keyof ServiceFormState>(key: K, value: ServiceFormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const result = toServiceInput(form);
    if (!result.input) {
      setErrors(result.errors);
      setFormError("Please fix the fields marked below.");
      return;
    }
    setErrors({});
    setFormError(undefined);
    setBusy(true);
    try {
      await adminRequest(id ? `/services/${id}` : "/services", {
        method: id ? "PATCH" : "POST",
        body: result.input,
      });
      toast.success(id ? "Service saved" : "Service created");
      onDone();
    } catch (err) {
      const problems = apiErrorsToForm(err);
      setErrors(problems.fields);
      setFormError(problems.form ?? "Please fix the fields marked below.");
      setBusy(false);
    }
  };

  const remove = async () => {
    await adminRequest(`/services/${id}`, { method: "DELETE" });
    toast.success("Service deleted");
    onDone();
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <PageHeader
        title={id ? "Edit service" : "New service"}
        actions={
          <Link href="/admin/services" className={cn(buttonVariants({ variant: "outline" }))}>
            Back to services
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
            hint="Used in the link: /services/your-web-address."
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
          <div>
            <p className="mb-1 font-medium">Description</p>
            <RichTextEditor
              label="Service description"
              value={form.description}
              onChange={(html) => update("description", html)}
            />
          </div>
          <Field
            id="startingPrice"
            label="Starting price (NPR)"
            hint="Optional. Shown as “From NPR ...”."
            error={errors["startingPrice"]}
          >
            <input
              id="startingPrice"
              inputMode="numeric"
              value={form.startingPrice}
              onChange={(event) => update("startingPrice", event.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
      </Card>
      <Card title="Image">
        <ImageField
          label="Service image"
          images={form.images}
          onChange={(images) => update("images", images)}
          folder="services"
          max={1}
        />
        {errors["image"] && (
          <p role="alert" className="text-brand mt-2 text-sm">
            {errors["image"]}
          </p>
        )}
      </Card>
      <Card title="Where it shows">
        <div className="space-y-3">
          <Switch
            id="showOnHome"
            label="Show on the home page"
            checked={form.showOnHome}
            onChange={(value) => update("showOnHome", value)}
          />
          <Switch
            id="isActive"
            label="Visible in the shop"
            checked={form.isActive}
            onChange={(value) => update("isActive", value)}
          />
          <Field
            id="order"
            label="Position"
            hint="Smaller numbers come first."
            error={errors["order"]}
          >
            <input
              id="order"
              inputMode="numeric"
              value={form.order}
              onChange={(event) => update("order", event.target.value)}
              className={cn(inputClass, "max-w-32")}
            />
          </Field>
        </div>
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
          {busy ? "Saving" : id ? "Save changes" : "Create service"}
        </button>
        {id && canDelete && (
          <ConfirmButton
            label="Delete service"
            title="Delete this service?"
            message="It disappears from the shop and the home page."
            confirmLabel="Delete service"
            onConfirm={remove}
          />
        )}
      </div>
    </form>
  );
}

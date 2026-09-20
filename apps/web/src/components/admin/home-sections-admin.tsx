"use client";

import {
  homeSectionUpdateSchema,
  type HomeSection,
  type HomeSectionType,
  type Product,
  type Review,
  type Service,
} from "@momento/shared";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { adminList, adminRequest } from "@/lib/admin-api";
import { apiErrorsToForm, issuesToErrors } from "@/lib/form-errors";
import { reorder } from "@/lib/reorder-list";
import { useAdminData } from "@/lib/use-admin-data";
import { Modal, Switch } from "./controls";
import { Badge, Card, ErrorNote, Field, inputClass, Loading, PageHeader } from "./ui";

const TYPE_LABEL: Record<HomeSectionType, string> = {
  hero: "Top banner",
  gallery: "Occasions",
  featured: "Featured products",
  services: "Services",
  reviews: "Customer reviews",
  guarantees: "Our promise",
};

/** What each kind of section lets you choose. The others only have text. */
const PICKS: Partial<Record<HomeSectionType, { path: string; noun: string }>> = {
  featured: { path: "/products?limit=100&active=true", noun: "products" },
  services: { path: "/services?limit=100", noun: "services" },
  reviews: { path: "/reviews?limit=100", noun: "reviews" },
};

interface Option {
  id: string;
  label: string;
}

const optionOf = (type: HomeSectionType, row: Product | Service | Review): Option => ({
  id: row.id,
  label:
    type === "reviews"
      ? `${(row as Review).name}: ${(row as Review).comment.slice(0, 60)}`
      : (row as Product | Service).title,
});

const smallButton =
  "border-input bg-surface hover:bg-muted focus-visible:outline-ring inline-flex min-h-11 items-center rounded-md border px-3 text-sm font-medium focus-visible:outline-2 disabled:opacity-40";

function ItemPicker({
  section,
  value,
  onChange,
}: {
  section: HomeSection;
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const pick = PICKS[section.type]!;
  const options = useAdminData(async () => {
    const res = await adminList<Product | Service | Review>(pick.path);
    return res.data.map((row) => optionOf(section.type, row));
  }, [section.type]);
  const byId = new Map((options.data ?? []).map((option) => [option.id, option.label]));

  return (
    <fieldset>
      <legend className="mb-1 font-medium">Which {pick.noun} to show</legend>
      <p className="text-muted-foreground mb-2 text-sm">
        {section.type === "services"
          ? "Ticked services come first, in the order below. Any other service marked “Show on the home page” follows them."
          : "Leave everything unticked to show them all. Ticked ones show in the order below."}
      </p>
      {options.loading && !options.data && <Loading />}
      {options.error && <ErrorNote message={options.error} onRetry={options.reload} />}
      <ul className="border-input bg-surface max-h-56 space-y-1 overflow-y-auto rounded-md border p-2">
        {(options.data ?? []).map((option) => (
          <li key={option.id}>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 px-1">
              <input
                type="checkbox"
                checked={value.includes(option.id)}
                onChange={() =>
                  onChange(
                    value.includes(option.id)
                      ? value.filter((id) => id !== option.id)
                      : [...value, option.id],
                  )
                }
                className="accent-brand size-4"
              />
              {option.label}
            </label>
          </li>
        ))}
      </ul>
      {value.length > 1 && (
        <ol className="mt-3 space-y-1">
          {value.map((id, index) => (
            <li key={id} className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate">
                {index + 1}. {byId.get(id) ?? "Removed item"}
              </span>
              <span className="flex shrink-0 gap-1">
                <button
                  type="button"
                  className={smallButton}
                  disabled={index === 0}
                  aria-label={`Move ${byId.get(id) ?? "item"} earlier`}
                  onClick={() => onChange(reorder(value, index, -1))}
                >
                  Earlier
                </button>
                <button
                  type="button"
                  className={smallButton}
                  disabled={index === value.length - 1}
                  aria-label={`Move ${byId.get(id) ?? "item"} later`}
                  onClick={() => onChange(reorder(value, index, 1))}
                >
                  Later
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}
    </fieldset>
  );
}

function SectionForm({
  section,
  onSaved,
  onCancel,
}: {
  section: HomeSection;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(section.title);
  const [subtitle, setSubtitle] = useState(section.subtitle ?? "");
  const [refs, setRefs] = useState(section.itemRefs);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const parsed = homeSectionUpdateSchema.safeParse({
      title,
      subtitle,
      itemRefs: PICKS[section.type] ? refs : undefined,
    });
    if (!parsed.success) {
      setErrors(issuesToErrors(parsed.error.issues));
      return;
    }
    setBusy(true);
    try {
      await adminRequest(`/home-sections/${section.id}`, { method: "PATCH", body: parsed.data });
      toast.success("Section saved");
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
      <Field id="section-title" label="Heading" error={errors["title"]}>
        <input
          id="section-title"
          value={title}
          maxLength={160}
          onChange={(event) => setTitle(event.target.value)}
          className={inputClass}
        />
      </Field>
      <Field
        id="section-subtitle"
        label="Text under the heading"
        hint="Optional."
        error={errors["subtitle"]}
      >
        <input
          id="section-subtitle"
          value={subtitle}
          maxLength={300}
          onChange={(event) => setSubtitle(event.target.value)}
          className={inputClass}
        />
      </Field>
      {PICKS[section.type] && <ItemPicker section={section} value={refs} onChange={setRefs} />}
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
          {busy ? "Saving" : "Save section"}
        </button>
      </div>
    </form>
  );
}

export function HomeSectionsAdmin() {
  const { data, error, loading, reload } = useAdminData(async () => {
    const res = await adminList<HomeSection>("/home-sections?limit=100&includeInactive=true");
    return [...res.data].sort((a, b) => a.order - b.order);
  });
  const [editing, setEditing] = useState<HomeSection | null>(null);
  const [busy, setBusy] = useState(false);

  const setVisible = async (section: HomeSection, isVisible: boolean) => {
    try {
      await adminRequest(`/home-sections/${section.id}`, { method: "PATCH", body: { isVisible } });
      reload();
    } catch (err) {
      toast.error(apiErrorsToForm(err).form ?? "Could not change it.");
    }
  };

  const move = async (index: number, by: number) => {
    if (!data || busy) return;
    setBusy(true);
    try {
      const next = reorder(data, index, by);
      // Numbers are rewritten to 0, 1, 2 ... so two sections can never share a place.
      await Promise.all(
        next.flatMap((section, position) =>
          section.order === position
            ? []
            : [
                adminRequest(`/home-sections/${section.id}`, {
                  method: "PATCH",
                  body: { order: position },
                }),
              ],
        ),
      );
      reload();
    } catch (err) {
      toast.error(apiErrorsToForm(err).form ?? "Could not move it.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Home page"
        description="Choose which sections the home page shows, and in what order."
      />
      {error && <ErrorNote message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && data.length === 0 && (
        <Card>
          <p className="text-muted-foreground">
            No sections yet. The home page shows a default layout until you add them.
          </p>
        </Card>
      )}
      {data && data.length > 0 && (
        <ol className="space-y-3">
          {data.map((section, index) => (
            <li key={section.id} className="bg-surface rounded-2xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{section.title}</p>
                  <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
                    {TYPE_LABEL[section.type]}
                    {!section.isVisible && <Badge>Hidden</Badge>}
                    {PICKS[section.type] && (
                      <span>
                        {section.itemRefs.length > 0
                          ? `${section.itemRefs.length} chosen`
                          : "showing all"}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    className={smallButton}
                    disabled={index === 0 || busy}
                    aria-label={`Move ${section.title} up`}
                    onClick={() => void move(index, -1)}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    className={smallButton}
                    disabled={index === data.length - 1 || busy}
                    aria-label={`Move ${section.title} down`}
                    onClick={() => void move(index, 1)}
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    className={smallButton}
                    aria-label={`Edit ${section.title}`}
                    onClick={() => setEditing(section)}
                  >
                    Edit
                  </button>
                </div>
              </div>
              <Switch
                id={`visible-${section.id}`}
                label="Show on the home page"
                checked={section.isVisible}
                onChange={(value) => void setVisible(section, value)}
              />
            </li>
          ))}
        </ol>
      )}
      <Modal open={editing !== null} title="Edit section" onClose={() => setEditing(null)}>
        {editing && (
          <SectionForm
            section={editing}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              reload();
            }}
          />
        )}
      </Modal>
    </>
  );
}

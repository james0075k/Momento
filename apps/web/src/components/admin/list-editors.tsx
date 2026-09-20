"use client";

import { inputClass } from "./ui";

const smallButton =
  "border-input bg-surface hover:bg-muted focus-visible:outline-ring inline-flex min-h-11 items-center rounded-md border px-4 text-sm font-medium focus-visible:outline-2";

/** A list of short texts (highlights): one box per line, with add and remove. */
export function StringListEditor({
  id,
  label,
  items,
  onChange,
  addLabel,
  placeholder,
}: {
  id: string;
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  addLabel: string;
  placeholder?: string;
}) {
  return (
    <fieldset>
      <legend className="mb-2 font-medium">{label}</legend>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex gap-2">
            <label htmlFor={`${id}-${index}`} className="sr-only">
              {label} {index + 1}
            </label>
            <input
              id={`${id}-${index}`}
              value={item}
              placeholder={placeholder}
              onChange={(event) =>
                onChange(items.map((value, i) => (i === index ? event.target.value : value)))
              }
              className={inputClass}
            />
            <button
              type="button"
              className={smallButton}
              aria-label={`Remove ${label} ${index + 1}`}
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className={`${smallButton} mt-2`}
        onClick={() => onChange([...items, ""])}
      >
        {addLabel}
      </button>
    </fieldset>
  );
}

/** A list of two-part entries (specs: label and value; FAQs: question and answer). */
export function PairListEditor<A extends string, B extends string>({
  id,
  label,
  items,
  onChange,
  fields,
  addLabel,
}: {
  id: string;
  label: string;
  items: Array<Record<A | B, string>>;
  onChange: (items: Array<Record<A | B, string>>) => void;
  fields: {
    a: { key: A; label: string; placeholder?: string };
    b: { key: B; label: string; placeholder?: string; multiline?: boolean };
  };
  addLabel: string;
}) {
  const blank = { [fields.a.key]: "", [fields.b.key]: "" } as Record<A | B, string>;
  const set = (index: number, key: A | B, value: string) =>
    onChange(items.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  return (
    <fieldset>
      <legend className="mb-2 font-medium">{label}</legend>
      <ul className="space-y-3">
        {items.map((item, index) => (
          <li key={index} className="bg-surface space-y-2 rounded-xl p-3">
            <div>
              <label htmlFor={`${id}-a-${index}`} className="mb-1 block text-sm font-medium">
                {fields.a.label} {index + 1}
              </label>
              <input
                id={`${id}-a-${index}`}
                value={item[fields.a.key]}
                placeholder={fields.a.placeholder}
                onChange={(event) => set(index, fields.a.key, event.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor={`${id}-b-${index}`} className="mb-1 block text-sm font-medium">
                {fields.b.label} {index + 1}
              </label>
              {fields.b.multiline ? (
                <textarea
                  id={`${id}-b-${index}`}
                  rows={3}
                  value={item[fields.b.key]}
                  placeholder={fields.b.placeholder}
                  onChange={(event) => set(index, fields.b.key, event.target.value)}
                  className={`${inputClass} py-2`}
                />
              ) : (
                <input
                  id={`${id}-b-${index}`}
                  value={item[fields.b.key]}
                  placeholder={fields.b.placeholder}
                  onChange={(event) => set(index, fields.b.key, event.target.value)}
                  className={inputClass}
                />
              )}
            </div>
            <button
              type="button"
              className={smallButton}
              aria-label={`Remove ${label} ${index + 1}`}
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className={`${smallButton} mt-2`}
        onClick={() => onChange([...items, blank])}
      >
        {addLabel}
      </button>
    </fieldset>
  );
}

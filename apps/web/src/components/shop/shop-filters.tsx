"use client";

import type { Category } from "@momento/shared";
import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { OCCASIONS } from "@/config/occasions";
import { shopSearch, SORTS, type ShopQuery, type SortValue } from "@/lib/shop-query";
import { cn } from "@/lib/utils";

const chip =
  "focus-visible:outline-ring inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";
const chipOff = "border-ink/15 bg-surface hover:bg-muted";
const chipOn = "border-ink bg-ink text-surface";

interface ChipRowProps {
  label: string;
  items: Array<{ slug: string; name: string }>;
  active?: string;
  hrefFor: (slug: string | undefined) => string;
}

function ChipRow({ label, items, active, hrefFor }: ChipRowProps) {
  if (items.length === 0) return null;
  return (
    <nav aria-label={label}>
      <p className="mb-2 text-sm font-semibold">{label}</p>
      {/* Scrolls sideways inside this row on a phone; the page itself never does. */}
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
        <li>
          <Link
            href={hrefFor(undefined)}
            aria-current={active === undefined ? "true" : undefined}
            className={cn(chip, active === undefined ? chipOn : chipOff)}
          >
            All
          </Link>
        </li>
        {items.map((entry) => (
          <li key={entry.slug}>
            <Link
              href={hrefFor(entry.slug)}
              aria-current={active === entry.slug ? "true" : undefined}
              className={cn(chip, active === entry.slug ? chipOn : chipOff)}
            >
              {entry.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

interface ShopFiltersProps {
  query: ShopQuery;
  categories: Category[];
}

/** Category and occasion chips are plain links, so filtering works before JavaScript loads. */
export function ShopFilters({ query, categories }: ShopFiltersProps) {
  const router = useRouter();
  const [text, setText] = useState(query.q ?? "");

  const go = (next: Partial<ShopQuery>) =>
    router.push(`/shop${shopSearch({ ...query, page: 1, ...next })}`);

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    go({ q: text.trim() || undefined });
  };

  return (
    <div className="space-y-5">
      <form role="search" onSubmit={onSearch} className="flex gap-2">
        <label htmlFor="shop-search" className="sr-only">
          Search products
        </label>
        <input
          id="shop-search"
          type="search"
          value={text}
          maxLength={100}
          onChange={(event) => setText(event.target.value)}
          placeholder="Search photo books, frames, magnets"
          className="border-input bg-surface focus-visible:outline-ring min-h-11 min-w-0 flex-1 rounded-md border px-4 text-base focus-visible:outline-2 focus-visible:outline-offset-2"
        />
        <button
          type="submit"
          className="bg-ink text-surface focus-visible:outline-ring inline-flex min-h-11 items-center gap-2 rounded-md px-4 font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <Search aria-hidden className="size-4" />
          Search
        </button>
      </form>

      <ChipRow
        label="Category"
        items={categories.map((category) => ({ slug: category.slug, name: category.name }))}
        active={query.category}
        hrefFor={(slug) => `/shop${shopSearch({ ...query, category: slug, page: 1 })}`}
      />
      <ChipRow
        label="Occasion"
        items={[...OCCASIONS]}
        active={query.occasion}
        hrefFor={(slug) => `/shop${shopSearch({ ...query, occasion: slug, page: 1 })}`}
      />

      <div className="flex items-center gap-3">
        <label htmlFor="shop-sort" className="text-sm font-semibold">
          Sort by
        </label>
        <select
          id="shop-sort"
          value={query.sort}
          onChange={(event) => go({ sort: event.target.value as SortValue })}
          className="border-input bg-surface focus-visible:outline-ring min-h-11 rounded-md border px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {SORTS.map((sort) => (
            <option key={sort.value} value={sort.value}>
              {sort.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

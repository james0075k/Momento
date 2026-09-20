import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

/**
 * A table on wide screens. On a phone each row becomes a card with the column names in front of the
 * values (pure CSS: it is the same table markup, so there is one copy of the content).
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty = "Nothing here yet.",
  caption,
}: {
  columns: Array<Column<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  empty?: string;
  caption: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="border-ink/15 text-muted-foreground rounded-2xl border border-dashed px-6 py-10 text-center">
        {empty}
      </p>
    );
  }
  return (
    <table className="w-full text-left">
      <caption className="sr-only">{caption}</caption>
      <thead className="hidden md:table-header-group">
        <tr className="border-ink/15 border-b">
          {columns.map((column) => (
            <th key={column.header} scope="col" className="px-3 py-2 text-sm font-semibold">
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="block md:table-row-group">
        {rows.map((row) => (
          <tr
            key={rowKey(row)}
            className="bg-surface md:border-ink/10 mb-3 block rounded-xl p-3 md:mb-0 md:table-row md:rounded-none md:border-b md:bg-transparent md:p-0"
          >
            {columns.map((column) => (
              <td
                key={column.header}
                data-label={column.header}
                className={cn(
                  "before:text-muted-foreground flex items-center justify-between gap-3 py-1 before:text-sm before:font-medium before:content-[attr(data-label)] md:table-cell md:px-3 md:py-3 md:before:hidden",
                  column.className,
                )}
              >
                {column.cell(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const button =
    "border-input bg-surface focus-visible:outline-ring min-h-11 rounded-md border px-5 font-medium focus-visible:outline-2 disabled:opacity-40";
  return (
    <nav aria-label="Pages" className="mt-6 flex items-center justify-between gap-3">
      <button
        type="button"
        className={button}
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        Previous
      </button>
      <span className="text-muted-foreground text-sm">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        className={button}
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        Next
      </button>
    </nav>
  );
}

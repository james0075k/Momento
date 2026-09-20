import Link from "next/link";
import type { Crumb } from "@/lib/jsonld";

/** Visible breadcrumb trail. The last crumb is the current page. */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-muted-foreground mb-5 text-sm">
      <ol className="flex flex-wrap items-center gap-x-2">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li
              key={crumb.path}
              className="flex items-center gap-x-2"
              aria-current={last ? "page" : undefined}
            >
              {index > 0 && <span aria-hidden>/</span>}
              {last ? (
                crumb.name
              ) : (
                <Link
                  href={crumb.path}
                  className="inline-flex min-h-8 items-center hover:underline"
                >
                  {crumb.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

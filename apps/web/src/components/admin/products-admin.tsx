"use client";

import type { Category, Product } from "@momento/shared";
import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import { adminList, adminRequest, query } from "@/lib/admin-api";
import { formatNpr } from "@/lib/format";
import { useAdminData } from "@/lib/use-admin-data";
import { cn } from "@/lib/utils";
import { ConfirmButton, Select } from "./controls";
import { DataTable, Pagination } from "./data-table";
import { useAdmin } from "./session";
import { Badge, ErrorNote, inputClass, Loading, PageHeader } from "./ui";

const LIMIT = 20;

export function ProductsAdmin() {
  const { isAdmin } = useAdmin();
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const categories = useAdminData(() =>
    adminList<Category>("/categories?limit=100&includeInactive=true"),
  );
  const products = useAdminData(
    () =>
      adminList<Product>(
        `/products${query({
          page,
          limit: LIMIT,
          q: search,
          category,
          includeInactive: true,
          active: status === "" ? undefined : status === "active",
        })}`,
      ),
    [search, category, status, page],
  );
  const names = new Map((categories.data?.data ?? []).map((entry) => [entry.id, entry.name]));

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(text.trim());
  };

  const remove = async (product: Product) => {
    await adminRequest(`/products/${product.id}`, { method: "DELETE" });
    toast.success(`Deleted ${product.title}`);
    products.reload();
  };

  return (
    <>
      <PageHeader
        title="Products"
        description="Photo books, frames, magnets and canvases."
        actions={
          <Link href="/admin/products/new" className={cn(buttonVariants())}>
            New product
          </Link>
        }
      />

      <form onSubmit={onSearch} className="mb-5 grid gap-2 md:grid-cols-[1fr_12rem_10rem_auto]">
        <label htmlFor="product-search" className="sr-only">
          Search products
        </label>
        <input
          id="product-search"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Search by name"
          className={inputClass}
        />
        <label htmlFor="product-category" className="sr-only">
          Category
        </label>
        <Select
          id="product-category"
          value={category}
          onChange={(event) => {
            setPage(1);
            setCategory(event.target.value);
          }}
        >
          <option value="">All categories</option>
          {(categories.data?.data ?? []).map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.name}
            </option>
          ))}
        </Select>
        <label htmlFor="product-status" className="sr-only">
          Visibility
        </label>
        <Select
          id="product-status"
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value);
          }}
        >
          <option value="">All products</option>
          <option value="active">Visible</option>
          <option value="hidden">Hidden</option>
        </Select>
        <button type="submit" className={cn(buttonVariants({ variant: "outline" }), "h-11")}>
          Search
        </button>
      </form>

      {products.error && <ErrorNote message={products.error} onRetry={products.reload} />}
      {products.loading && !products.data && <Loading />}
      {products.data && (
        <>
          <DataTable
            caption="Products"
            rows={products.data.data}
            rowKey={(product) => product.id}
            empty={
              search || category || status
                ? "No products match."
                : "No products yet. Add your first one."
            }
            columns={[
              {
                header: "Image",
                cell: (product) => (
                  <span className="bg-muted relative block size-12 overflow-hidden rounded-lg">
                    {product.images[0] && (
                      <Image
                        src={product.images[0]}
                        alt=""
                        fill
                        sizes="3rem"
                        className="object-cover"
                      />
                    )}
                  </span>
                ),
              },
              {
                header: "Product",
                cell: (product) => (
                  <span>
                    <span className="block font-medium">{product.title}</span>
                    <span className="text-muted-foreground text-sm">
                      {names.get(product.categoryId) ?? "No category"}
                    </span>
                  </span>
                ),
              },
              {
                header: "Price",
                cell: (product) =>
                  product.variants.length > 0
                    ? `From ${formatNpr(Math.min(...product.variants.map((variant) => variant.price)))}`
                    : formatNpr(product.basePrice),
              },
              {
                header: "Status",
                cell: (product) => (
                  <span className="flex flex-wrap gap-1">
                    <Badge tone={product.isActive ? "success" : "neutral"}>
                      {product.isActive ? "Visible" : "Hidden"}
                    </Badge>
                    {product.isFeatured && <Badge tone="warning">Featured</Badge>}
                  </span>
                ),
              },
              {
                header: "Actions",
                cell: (product) => (
                  <span className="flex flex-wrap items-center gap-1">
                    <Link
                      href={`/admin/products/${product.id}`}
                      aria-label={`Edit ${product.title}`}
                      className="text-brand focus-visible:outline-ring inline-flex min-h-11 items-center px-2 font-medium underline underline-offset-4 focus-visible:outline-2"
                    >
                      Edit
                    </Link>
                    {isAdmin && (
                      <ConfirmButton
                        label="Delete"
                        title={`Delete ${product.title}?`}
                        message="It disappears from the shop. Old orders keep their own copy of what was bought."
                        confirmLabel="Delete product"
                        onConfirm={() => remove(product)}
                      />
                    )}
                  </span>
                ),
              },
            ]}
          />
          <Pagination
            page={page}
            totalPages={products.data.meta.totalPages}
            onPage={(next) => setPage(next)}
          />
        </>
      )}
    </>
  );
}

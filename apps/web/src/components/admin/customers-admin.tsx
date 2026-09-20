"use client";

import type { Customer } from "@momento/shared";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { adminList, query } from "@/lib/admin-api";
import { formatNepalDate, formatNpr } from "@/lib/format";
import { useAdminData } from "@/lib/use-admin-data";
import { DataTable, Pagination } from "./data-table";
import { ErrorNote, inputClass, Loading, PageHeader } from "./ui";

const LIMIT = 20;

export function CustomersAdmin() {
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const customers = useAdminData(
    () => adminList<Customer>(`/customers${query({ page, limit: LIMIT, q: search })}`),
    [search, page],
  );

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(text.trim());
  };

  return (
    <>
      <PageHeader
        title="Customers"
        description="Worked out from orders: the same phone number is the same customer. Most recent first."
      />

      <form onSubmit={onSearch} className="mb-5 grid gap-2 md:grid-cols-[1fr_auto]">
        <label htmlFor="customer-search" className="sr-only">
          Search customers
        </label>
        <input
          id="customer-search"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Name or phone"
          className={inputClass}
        />
        <button
          type="submit"
          className="border-input bg-surface focus-visible:outline-ring min-h-11 rounded-md border px-5 font-medium focus-visible:outline-2"
        >
          Search
        </button>
      </form>

      {customers.error && <ErrorNote message={customers.error} onRetry={customers.reload} />}
      {customers.loading && !customers.data && <Loading />}
      {customers.data && (
        <>
          <DataTable
            caption="Customers"
            rows={customers.data.data}
            rowKey={(customer) => customer.key}
            empty={
              search ? "No customers match." : "No customers yet. They appear with the first order."
            }
            columns={[
              {
                header: "Name",
                cell: (customer) => <span className="font-medium">{customer.name}</span>,
              },
              {
                header: "Phone",
                cell: (customer) => (
                  <a
                    href={`tel:${customer.phone}`}
                    className="text-brand focus-visible:outline-ring inline-flex min-h-11 items-center underline underline-offset-4 focus-visible:outline-2"
                  >
                    {customer.phone}
                  </a>
                ),
              },
              { header: "Orders", cell: (customer) => customer.orders },
              { header: "Spent", cell: (customer) => formatNpr(customer.spent) },
              { header: "First order", cell: (customer) => formatNepalDate(customer.firstOrderAt) },
              { header: "Last order", cell: (customer) => formatNepalDate(customer.lastOrderAt) },
              {
                header: "Actions",
                cell: (customer) => (
                  <Link
                    href={`/admin/orders${query({ q: customer.key })}`}
                    aria-label={`See orders from ${customer.name}`}
                    className="text-brand focus-visible:outline-ring inline-flex min-h-11 items-center font-medium underline underline-offset-4 focus-visible:outline-2"
                  >
                    See orders
                  </Link>
                ),
              },
            ]}
          />
          <Pagination
            page={customers.data.meta.page}
            totalPages={customers.data.meta.totalPages}
            onPage={setPage}
          />
        </>
      )}
      <p className="text-muted-foreground mt-4 text-sm">
        Spent leaves out cancelled orders. Names and phones come from the most recent order.
      </p>
    </>
  );
}

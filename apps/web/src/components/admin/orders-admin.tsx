"use client";

import { orderStatusSchema, type Order } from "@momento/shared";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { adminList, query } from "@/lib/admin-api";
import { formatNepalDateTime, formatNpr } from "@/lib/format";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/order-status";
import { useAdminData } from "@/lib/use-admin-data";
import { Select } from "./controls";
import { DataTable, Pagination } from "./data-table";
import { Badge, ErrorNote, inputClass, Loading, PageHeader } from "./ui";

const LIMIT = 20;

export function OrdersAdmin({ initialSearch = "" }: { initialSearch?: string }) {
  const [text, setText] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const orders = useAdminData(
    () => adminList<Order>(`/orders${query({ page, limit: LIMIT, q: search, status })}`),
    [search, status, page],
  );

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(text.trim());
  };

  return (
    <>
      <PageHeader
        title="Orders"
        description="Newest first. Open an order to change its status, add notes, print the slip or reply on WhatsApp."
      />

      <form onSubmit={onSearch} className="mb-5 grid gap-2 md:grid-cols-[1fr_14rem_auto]">
        <label htmlFor="order-search" className="sr-only">
          Search orders
        </label>
        <input
          id="order-search"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Order code, name or phone"
          className={inputClass}
        />
        <label htmlFor="order-status" className="sr-only">
          Status
        </label>
        <Select
          id="order-status"
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value);
          }}
        >
          <option value="">All statuses</option>
          {orderStatusSchema.options.map((value) => (
            <option key={value} value={value}>
              {STATUS_LABEL[value]}
            </option>
          ))}
        </Select>
        <button
          type="submit"
          className="border-input bg-surface focus-visible:outline-ring min-h-11 rounded-md border px-5 font-medium focus-visible:outline-2"
        >
          Search
        </button>
      </form>

      {orders.error && <ErrorNote message={orders.error} onRetry={orders.reload} />}
      {orders.loading && !orders.data && <Loading />}
      {orders.data && (
        <>
          <DataTable
            caption="Orders"
            rows={orders.data.data}
            rowKey={(order) => order.id}
            empty={search || status ? "No orders match." : "No orders yet."}
            columns={[
              {
                header: "Order",
                cell: (order) => (
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="text-brand focus-visible:outline-ring inline-flex min-h-11 items-center font-semibold underline underline-offset-4 focus-visible:outline-2"
                  >
                    {order.code}
                  </Link>
                ),
              },
              { header: "Placed", cell: (order) => formatNepalDateTime(order.createdAt) },
              {
                header: "Customer",
                cell: (order) => (
                  <span className="text-right md:text-left">
                    {order.customer.name}
                    <span className="text-muted-foreground block text-sm">
                      {order.customer.phone}
                    </span>
                  </span>
                ),
              },
              {
                header: "Items",
                cell: (order) => order.items.reduce((sum, item) => sum + item.quantity, 0),
              },
              { header: "Total", cell: (order) => formatNpr(order.total) },
              {
                header: "Status",
                cell: (order) => (
                  <Badge tone={STATUS_TONE[order.status]}>{STATUS_LABEL[order.status]}</Badge>
                ),
              },
            ]}
          />
          <Pagination
            page={orders.data.meta.page}
            totalPages={orders.data.meta.totalPages}
            onPage={setPage}
          />
        </>
      )}
    </>
  );
}

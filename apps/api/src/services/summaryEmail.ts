import type { DailySummary } from "./summary";
import type { EmailMessage } from "./email";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const npr = (amount: number) => `NPR ${amount.toLocaleString("en-IN")}`;
const STATUS_LABEL: Record<string, string> = {
  pending_payment: "waiting for payment",
  paid: "paid",
  printing: "printing",
  shipped: "shipped",
  delivered: "delivered",
  cancelled: "cancelled",
};

/**
 * The daily email. Every customer-supplied value (names) is escaped for HTML, links are only the
 * wa.me links this server built, and there are no addresses: a phone number appears only inside a link.
 */
export function renderSummaryEmail(summary: DailySummary): EmailMessage {
  const { day } = summary;
  const statusLine =
    Object.entries(summary.byStatus)
      .map(([status, count]) => `${count} ${STATUS_LABEL[status] ?? status}`)
      .join(", ") || "none";
  const subject = `Momento daily summary, ${day}: ${summary.newOrders} new ${summary.newOrders === 1 ? "order" : "orders"}`;

  const text = [
    `Momento daily summary for ${day}`,
    "",
    `New orders: ${summary.newOrders} (${statusLine})`,
    `Payments received: ${summary.paid.count}, ${npr(summary.paid.amount)}`,
    `Reviews waiting for approval: ${summary.reviewsAwaitingApproval}`,
    "",
    "Top products:",
    ...(summary.topProducts.length > 0
      ? summary.topProducts.map((p) => `- ${p.quantity} x ${p.title}`)
      : ["- none"]),
    "",
    "Waiting for payment for more than a day:",
    ...(summary.pendingPayments.length > 0
      ? summary.pendingPayments.map(
          (o) =>
            `- ${o.code}, ${o.name}, ${npr(o.total)}, ${o.hoursOld} h${o.replyLink ? `: ${o.replyLink}` : ""}`,
        )
      : ["- none"]),
    "",
    "Delivered, ready for a review request:",
    ...(summary.reviewRequests.length > 0
      ? summary.reviewRequests.map((o) => `- ${o.code}, ${o.name}${o.link ? `: ${o.link}` : ""}`)
      : ["- none"]),
  ].join("\n");

  const list = (rows: string[]) =>
    rows.length > 0 ? `<ul>${rows.map((row) => `<li>${row}</li>`).join("")}</ul>` : "<p>None.</p>";
  const link = (url: string | undefined, label: string) =>
    url ? ` <a href="${escapeHtml(url)}">${label}</a>` : "";

  const html = `<!doctype html><html><body>
<h1>Momento daily summary, ${escapeHtml(day)}</h1>
<p><strong>${summary.newOrders}</strong> new ${summary.newOrders === 1 ? "order" : "orders"} (${escapeHtml(statusLine)}).<br>
Payments received: <strong>${summary.paid.count}</strong>, ${escapeHtml(npr(summary.paid.amount))}.<br>
Reviews waiting for approval: <strong>${summary.reviewsAwaitingApproval}</strong>.</p>
<h2>Top products</h2>
${list(summary.topProducts.map((p) => `${p.quantity} x ${escapeHtml(p.title)}`))}
<h2>Waiting for payment for more than a day</h2>
${list(
  summary.pendingPayments.map(
    (o) =>
      `${escapeHtml(o.code)}, ${escapeHtml(o.name)}, ${escapeHtml(npr(o.total))}, ${o.hoursOld} h.${link(o.replyLink, "Message on WhatsApp")}`,
  ),
)}
<h2>Delivered, ready for a review request</h2>
${list(
  summary.reviewRequests.map(
    (o) =>
      `${escapeHtml(o.code)}, ${escapeHtml(o.name)}.${link(o.link, "Ask for a review on WhatsApp")}`,
  ),
)}
</body></html>`;

  return { subject, html, text };
}

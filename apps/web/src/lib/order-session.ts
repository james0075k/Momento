import type { Order } from "@momento/shared";

const KEY = "momento.lastOrder.v1";

/**
 * The confirmation page shows the order the customer just placed. It lives in sessionStorage
 * (this tab only), never in the URL, so an order code alone opens nothing.
 */
export function saveLastOrder(order: Order): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(order));
  } catch {
    // Confirmation falls back to the tracking form.
  }
}

export function readLastOrder(code: string): Order | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const order = JSON.parse(raw) as Order;
    return order.code === code ? order : null;
  } catch {
    return null;
  }
}

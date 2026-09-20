import { ORDER_STATUS_TRANSITIONS, type OrderStatus } from "@momento/shared";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Waiting for payment",
  paid: "Paid",
  printing: "Printing",
  shipped: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** What an admin can do next (the API enforces the same rules and answers 409 otherwise). */
export function nextStatuses(status: OrderStatus): readonly OrderStatus[] {
  return ORDER_STATUS_TRANSITIONS[status];
}

/** The button text for moving an order to a status. */
export const ACTION_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Mark as waiting for payment",
  paid: "Mark as paid",
  printing: "Start printing",
  shipped: "Mark as shipped",
  delivered: "Mark as delivered",
  cancelled: "Cancel order",
};

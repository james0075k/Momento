/** Shapes the admin API returns that are not already in @momento/shared. */
export interface Dashboard {
  generatedAt: string;
  today: { day: string; orders: number; paidOrders: number; revenue: number };
  month: { month: string; orders: number; paidOrders: number; revenue: number };
  pendingPayments: { count: number; amount: number };
  ordersByStatus: Record<string, number>;
  topProducts: Array<{ title: string; quantity: number }>;
  reviewsAwaitingApproval: {
    count: number;
    latest: Array<{ id: string; name: string; rating: number; comment: string; createdAt: string }>;
  };
}

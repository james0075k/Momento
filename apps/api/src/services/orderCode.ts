import { CounterModel } from "../models/Order";

export function formatOrderCode(year: number, seq: number): string {
  return `MOM-${year}-${String(seq).padStart(4, "0")}`;
}

/** Atomically allocates the next MOM-YYYY-#### code. The counter restarts each year. */
export async function nextOrderCode(now = new Date()): Promise<string> {
  const year = now.getUTCFullYear();
  const counter = await CounterModel.findOneAndUpdate(
    { _id: `order-${year}` },
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  );
  return formatOrderCode(year, counter.seq);
}

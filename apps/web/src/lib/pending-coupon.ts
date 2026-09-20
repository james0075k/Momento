const KEY = "momento.pending-coupon.v1";
const SHAPE = /^[A-Z0-9_-]{3,32}$/;

const clean = (value: string | null | undefined): string | null => {
  const code = value?.trim().toUpperCase() ?? "";
  return SHAPE.test(code) ? code : null;
};

/** Remembers a coupon from the festival banner until the customer reaches checkout. */
export function savePendingCoupon(code: string): void {
  const valid = clean(code);
  if (!valid) return;
  try {
    window.sessionStorage.setItem(KEY, valid);
  } catch {
    // Without storage the customer can still type the code.
  }
}

/** A coupon from `?coupon=CODE` or the banner, once. Anything that is not a plain code is ignored. */
export function takePendingCoupon(fromUrl?: string | null): string | null {
  let stored: string | null = null;
  try {
    stored = window.sessionStorage.getItem(KEY);
    window.sessionStorage.removeItem(KEY);
  } catch {
    stored = null;
  }
  return clean(fromUrl) ?? clean(stored);
}

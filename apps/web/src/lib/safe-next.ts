/** Only send people back to a page inside the admin area, never to another site or the login page. */
export function safeNext(value: string | null | undefined): string {
  return value && /^\/admin(\/[^\s\\]*)?$/.test(value) && !value.startsWith("/admin/login")
    ? value
    : "/admin";
}

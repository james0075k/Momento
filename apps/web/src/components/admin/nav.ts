export interface NavItem {
  label: string;
  href: string;
  /** Hidden from staff. The API refuses them too; this only keeps the menu honest. */
  adminOnly?: boolean;
}

/** The admin menu. Items are added as their screens are built. */
export const NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Reviews", href: "/admin/reviews" },
  { label: "Customers", href: "/admin/customers" },
  { label: "Products", href: "/admin/products" },
  { label: "Services", href: "/admin/services" },
  { label: "Categories", href: "/admin/categories" },
  { label: "Home page", href: "/admin/home" },
  { label: "Coupons", href: "/admin/coupons", adminOnly: true },
  { label: "Gift cards", href: "/admin/gift-cards", adminOnly: true },
];

export function navFor(isAdmin: boolean): NavItem[] {
  return NAV.filter((item) => isAdmin || !item.adminOnly);
}

/** True when `pathname` is this item's page or inside it (the dashboard only matches itself). */
export function isActive(item: NavItem, pathname: string): boolean {
  return item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
}
